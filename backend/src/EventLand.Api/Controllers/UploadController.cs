namespace EventLand.Api.Controllers;

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SkiaSharp;

[ApiController]
[Route("api/upload")]
[Authorize(Roles = "SuperAdmin,Admin,Organizer")]
[Produces("application/json")]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private const long MaxFileSizeInBytes = 25 * 1024 * 1024; // Allow uploads up to 25 MB before compression
    private const long OneMbInBytes = 1 * 1024 * 1024; // 1 MB target threshold

    public UploadController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpPost]
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

        var subFolder = (type?.ToLowerInvariant()) switch
        {
            "organizer" or "organizers" => Path.Combine("assets", "images", "organizers"),
            "user" or "users" => Path.Combine("assets", "images", "users"),
            _ => Path.Combine("assets", "images", "events")
        };

        var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var targetFolder = Path.Combine(webRootPath, subFolder);

        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        var targetFileName = FileUrlHelper.FormatEntityImageFileName(type ?? "events", name, id ?? 1, extension);
        var basePattern = Path.GetFileNameWithoutExtension(targetFileName);

        // Delete any existing image variants for this entity to replace the file cleanly
        try
        {
            foreach (var existingFile in Directory.GetFiles(targetFolder, $"{basePattern}.*"))
            {
                if (System.IO.File.Exists(existingFile))
                {
                    System.IO.File.Delete(existingFile);
                }
            }
        }
        catch
        {
            // Ignore file delete errors safely
        }

        var filePath = Path.Combine(targetFolder, targetFileName);

        // Check if uploaded file is greater than 1 MB. If so, compress using free SkiaSharp library (MIT License)
        if (file.Length > OneMbInBytes)
        {
            try
            {
                using var inputStream = file.OpenReadStream();
                using var originalBitmap = SKBitmap.Decode(inputStream);

                if (originalBitmap != null)
                {
                    var format = extension switch
                    {
                        ".png" => SKEncodedImageFormat.Png,
                        ".webp" => SKEncodedImageFormat.Webp,
                        _ => SKEncodedImageFormat.Jpeg
                    };

                    byte[] compressedBytes = CompressBitmapToUnder1Mb(originalBitmap, format);
                    await System.IO.File.WriteAllBytesAsync(filePath, compressedBytes);
                }
                else
                {
                    // Fallback to direct stream copy if bitmap decoding fails
                    using var stream = new FileStream(filePath, FileMode.Create);
                    await file.CopyToAsync(stream);
                }
            }
            catch
            {
                // Fallback safely to direct stream copy
                using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);
            }
        }
        else
        {
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
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
}
