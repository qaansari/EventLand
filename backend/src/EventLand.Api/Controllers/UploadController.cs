namespace EventLand.Api.Controllers;

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Api.Extensions;
using EventLand.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SkiaSharp;

[ApiController]
[Route("api/upload")]
[Authorize]
[Produces("application/json")]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<UploadController> _logger;
    private const long MaxFileSizeInBytes = 25 * 1024 * 1024; // Allow uploads up to 25 MB before compression
    private const long OneMbInBytes = 1 * 1024 * 1024; // 1 MB target threshold

    public UploadController(IWebHostEnvironment environment, ILogger<UploadController> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    [HttpPost]
    [EnableRateLimiting("upload")]
    public async Task<IActionResult> UploadFile(
        IFormFile? file,
        [FromQuery] string? type = "events",
        [FromQuery] string? name = null,
        [FromQuery] int? id = null)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file was uploaded." });
        }

        if (file.Length > MaxFileSizeInBytes)
        {
            return BadRequest(new { message = "File size exceeds maximum upload limit." });
        }

        // Strict extension & content-type validation: webp, jpg, jpeg, png ONLY
        var allowedExtensions = new[] { ".webp", ".jpg", ".jpeg", ".png" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = $"Unsupported file format '{extension}'. Only webp, jpg, and png images are allowed." });
        }

        var allowedContentTypes = new[] { "image/webp", "image/jpeg", "image/png", "image/pjpeg" };
        if (!string.IsNullOrWhiteSpace(file.ContentType) && !allowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return BadRequest(new { message = "Invalid content type for image upload." });
        }

        // Validate image magic-byte signature & scan for executable/script malware payloads
        using (var scanStream = file.OpenReadStream())
        {
            if (!IsValidImageHeader(scanStream, extension))
            {
                return BadRequest(new { message = "Corrupted or invalid image file signature." });
            }

            if (ContainsSuspiciousSignatures(scanStream))
            {
                _logger.LogWarning("Potential malware or script payload rejected during file upload: {FileName}", file.FileName);
                return BadRequest(new { message = "File was rejected due to suspicious content detected." });
            }
        }

        var normalizedType = (type ?? "events").ToLowerInvariant();

        // Role-based upload restrictions:
        // Customers are ONLY permitted to upload payment slips ('slip', 'proof', etc.) or user avatars ('user', 'users').
        // Events, artists, and organizers require admin or organizer privileges.
        // Bank QR codes require Admin or SuperAdmin privileges.
        bool isAdmin = User.IsAdmin();
        bool isOrganizer = User.IsOrganizer();

        bool isPrivilegedType = normalizedType switch
        {
            "qrcode" or "qr_code" or "qr_codes" or "bank" or "bankaccount" or "bankaccounts" => true,
            "organizer" or "organizers" => true,
            "artist" or "artists" => true,
            "event" or "events" => true,
            _ => false
        };

        if (isPrivilegedType && !isAdmin && !isOrganizer)
        {
            return Forbid();
        }

        // Bank QR code upload is restricted to administrators only
        if ((normalizedType.Contains("qr") || normalizedType.Contains("bank")) && !isAdmin)
        {
            return Forbid();
        }

        var subFolder = normalizedType switch
        {
            "organizer" or "organizers" => Path.Combine("assets", "images", "organizers"),
            "user" or "users" => Path.Combine("assets", "images", "users"),
            "artist" or "artists" => Path.Combine("assets", "images", "artists"),
            "qrcode" or "qr_code" or "qr_codes" or "bank" or "bankaccount" or "bankaccounts" => Path.Combine("assets", "images", "qr_codes"),
            "slip" or "slips" or "proof" or "proofs" or "transaction" or "transactions" or "paymentproof" or "paymentproofs" or "receipt" or "receipts" => Path.Combine("assets", "images", "slips"),
            _ => Path.Combine("assets", "images", "events")
        };

        var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var targetFolder = Path.Combine(webRootPath, subFolder);

        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        // Use full entity id so ids sharing last-two-digits (e.g. 1 and 101) never collide.
        // When no id is supplied, generate a Guid-based suffix for uniqueness.
        string targetFileName;
        if (id.HasValue)
        {
            targetFileName = FileUrlHelper.FormatEntityImageFileName(type ?? "events", name, id.Value, extension);
        }
        else
        {
            var guidSuffix = Guid.NewGuid().ToString("N")[..8];
            // Reuse the same prefix/cleanName logic but with a Guid suffix
            var tmpName = FileUrlHelper.FormatEntityImageFileName(type ?? "events", name, 0, extension);
            var tmpBase = Path.GetFileNameWithoutExtension(tmpName);
            var baseWithoutId = tmpBase[..tmpBase.LastIndexOf('_')];
            targetFileName = $"{baseWithoutId}_{guidSuffix}{extension}";
        }

        var basePattern = Path.GetFileNameWithoutExtension(targetFileName);

        // Validate basePattern does not contain path separators (defense against traversal)
        if (basePattern.Contains('/') || basePattern.Contains('\\') || basePattern.Contains(".."))
        {
            return BadRequest(new { message = "Invalid file name pattern." });
        }

        try
        {
            var existingFile = Path.Combine(targetFolder, targetFileName);
            if (System.IO.File.Exists(existingFile))
            {
                System.IO.File.Delete(existingFile);
            }
            else
            {
                foreach (var candidate in Directory.GetFiles(targetFolder, $"{basePattern}.*"))
                {
                    if (!string.Equals(Path.GetExtension(candidate), extension, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var candidateBase = Path.GetFileNameWithoutExtension(candidate);
                    if (!string.Equals(candidateBase, basePattern, StringComparison.Ordinal))
                    {
                        continue;
                    }

                    if (System.IO.File.Exists(candidate))
                    {
                        System.IO.File.Delete(candidate);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete existing file before overwrite: {FilePath}", targetFileName);
        }

        var filePath = Path.Combine(targetFolder, targetFileName);

        // MANDATORY PIXEL SANITIZATION & RE-ENCODING:
        // Every image is decoded through SkiaSharp into pure raster pixels and re-encoded.
        // This eliminates raw-stream copying and purges all executable polyglots, embedded PHP,
        // and malicious metadata/EXIF payloads.
        try
        {
            using var inputStream = file.OpenReadStream();
            using var originalBitmap = SKBitmap.Decode(inputStream);

            if (originalBitmap == null)
            {
                return BadRequest(new { message = "Invalid or corrupted image data. The file could not be parsed." });
            }

            // Image decompression bomb defense: reject excessive pixel resolutions
            if (originalBitmap.Width > 4096 || originalBitmap.Height > 4096)
            {
                return BadRequest(new { message = "Image resolution exceeds maximum allowed limit (4096 x 4096)." });
            }

            var format = extension switch
            {
                ".png" => SKEncodedImageFormat.Png,
                ".webp" => SKEncodedImageFormat.Webp,
                _ => SKEncodedImageFormat.Jpeg
            };

            byte[] safeBytes;
            if (file.Length > OneMbInBytes || originalBitmap.Width > 2400 || originalBitmap.Height > 2400)
            {
                safeBytes = CompressBitmapToUnder1Mb(originalBitmap, format);
            }
            else
            {
                using var image = SKImage.FromBitmap(originalBitmap);
                using var data = image.Encode(format, 90);
                safeBytes = data != null ? data.ToArray() : CompressBitmapToUnder1Mb(originalBitmap, format);
            }

            await System.IO.File.WriteAllBytesAsync(filePath, safeBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing and sanitizing uploaded image {FileName}", file.FileName);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Failed to safely process image." });
        }

        var relativePath = subFolder.Replace('\\', '/');
        var fileUrl = $"/{relativePath}/{targetFileName}";

        return Ok(new { url = fileUrl, fileName = targetFileName });
    }

    private static byte[] CompressBitmapToUnder1Mb(SKBitmap originalBitmap, SKEncodedImageFormat format)
    {
        int quality = 85;
        byte[] result = Array.Empty<byte>();

        // If dimensions are larger than 2400px, resize proportionally first
        SKBitmap bitmapToEncode = originalBitmap;
        bool wasResized = false;
        if (originalBitmap.Width > 2400 || originalBitmap.Height > 2400)
        {
            float scale = Math.Min(2400f / originalBitmap.Width, 2400f / originalBitmap.Height);
            int newWidth = Math.Max(1, (int)(originalBitmap.Width * scale));
            int newHeight = Math.Max(1, (int)(originalBitmap.Height * scale));
            bitmapToEncode = originalBitmap.Resize(new SKImageInfo(newWidth, newHeight), SKFilterQuality.High) ?? originalBitmap;
            wasResized = bitmapToEncode != originalBitmap;
        }

        try
        {
            using var image = SKImage.FromBitmap(bitmapToEncode);
            while (quality >= 30)
            {
                using var data = image.Encode(format, quality);
                if (data != null)
                {
                    result = data.ToArray();
                    if (result.Length <= 1 * 1024 * 1024) break;
                }
                quality -= 10;
            }
        }
        finally
        {
            if (wasResized && bitmapToEncode != null)
            {
                bitmapToEncode.Dispose();
            }
        }

        return result;
    }

    private static bool ContainsSuspiciousSignatures(Stream stream)
    {
        try
        {
            if (stream.CanSeek) stream.Position = 0;

            // Inspect the first 16KB of file content for embedded scripts or executable signatures
            byte[] buffer = new byte[Math.Min(stream.Length, 16384)];
            int bytesRead = stream.Read(buffer, 0, buffer.Length);
            if (stream.CanSeek) stream.Position = 0;

            if (bytesRead < 4) return false;

            // Reject PE executable (MZ = 0x4D, 0x5A) or ELF executable (0x7F, 'E', 'L', 'F')
            if (buffer[0] == 0x4D && buffer[1] == 0x5A) return true;
            if (buffer[0] == 0x7F && buffer[1] == 0x45 && buffer[2] == 0x4C && buffer[3] == 0x46) return true;

            // Reject files containing web shell or script tags disguised as images
            var text = System.Text.Encoding.ASCII.GetString(buffer).ToLowerInvariant();
            string[] forbiddenSignatures = 
            { 
                "<?php", "<script", "<%", "eval(", "base64_decode(", 
                "system(", "passthru(", "shell_exec(", "popen(" 
            };

            foreach (var sig in forbiddenSignatures)
            {
                if (text.Contains(sig, StringComparison.OrdinalIgnoreCase)) return true;
            }

            return false;
        }
        catch
        {
            return false;
        }
    }

    private static bool IsValidImageHeader(Stream stream, string extension)
    {
        if (stream.CanSeek) stream.Position = 0;
        byte[] header = new byte[12];
        int bytesRead = stream.Read(header, 0, header.Length);
        if (stream.CanSeek) stream.Position = 0;
        if (bytesRead < 4) return false;

        return extension switch
        {
            ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
            ".webp" => bytesRead >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                        && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
            _ => false
        };
    }
}
