namespace EventLand.Api.Controllers;

using EventLand.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/upload")]
[Authorize(Roles = "SuperAdmin,Admin,Organizer")]
[Produces("application/json")]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;
    private const long MaxFileSizeInBytes = 10 * 1024 * 1024; // 10 MB

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
            return BadRequest(new { message = "File size exceeds the 10 MB limit." });
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
            _ => Path.Combine("assets", "images", "events")
        };

        var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var targetFolder = Path.Combine(webRootPath, subFolder);

        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        // Format name according to rule: org_[organizernamewithoutspace]_[last2digits].[ext] or ev_[eventnamewithoutspace]_[last2digits].[ext]
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

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativePath = subFolder.Replace('\\', '/');
        var fileUrl = $"/{relativePath}/{targetFileName}";

        return Ok(new { url = fileUrl, fileName = targetFileName });
    }
}
