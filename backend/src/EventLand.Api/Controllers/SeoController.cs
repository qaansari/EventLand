namespace EventLand.Api.Controllers;

using System.Text;
using System.Xml;
using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Produces("application/xml", "text/plain")]
public class SeoController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public SeoController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Generates dynamic XML Sitemap indexing home page, category tags, cities, and published event URL slugs.
    /// </summary>
    [HttpGet("sitemap.xml")]
    [AllowAnonymous]
    [Produces("application/xml")]
    public async Task<IActionResult> GetSitemapXml()
    {
        var baseUrl = "https://eventland.pk";

        var publishedEvents = await _context.Events
            .AsNoTracking()
            .Where(e => !e.IsDeleted && e.IsPublished)
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.UpdatedAt,
                e.CreatedAt
            })
            .ToListAsync();

        var xmlSettings = new XmlWriterSettings
        {
            Encoding = Encoding.UTF8,
            Indent = true,
            Async = true
        };

        using var memoryStream = new MemoryStream();
        using (var writer = XmlWriter.Create(memoryStream, xmlSettings))
        {
            writer.WriteStartDocument();
            writer.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");

            // 1. Home Page
            writer.WriteStartElement("url");
            writer.WriteXmlElement("loc", $"{baseUrl}/");
            writer.WriteXmlElement("changefreq", "daily");
            writer.WriteXmlElement("priority", "1.0");
            writer.WriteEndElement();

            // 2. Main Categories / Static Sections
            var categories = new[] { "concerts", "comedy", "theatre", "festivals", "workshops" };
            foreach (var cat in categories)
            {
                writer.WriteStartElement("url");
                writer.WriteXmlElement("loc", $"{baseUrl}/?category={cat}");
                writer.WriteXmlElement("changefreq", "daily");
                writer.WriteXmlElement("priority", "0.8");
                writer.WriteEndElement();
            }

            // 3. Published Events with SEO Slugs
            foreach (var ev in publishedEvents)
            {
                var cleanTitle = new string((ev.Title ?? "")
                    .ToLowerInvariant()
                    .Trim()
                    .Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c) || c == '-')
                    .ToArray())
                    .Replace(' ', '-');

                var slug = string.IsNullOrWhiteSpace(cleanTitle) ? $"event-{ev.Id}" : $"{cleanTitle}-{ev.Id}";
                var lastModDate = ev.UpdatedAt.ToString("yyyy-MM-dd");

                writer.WriteStartElement("url");
                writer.WriteXmlElement("loc", $"{baseUrl}/event/{slug}");
                writer.WriteXmlElement("lastmod", lastModDate);
                writer.WriteXmlElement("changefreq", "weekly");
                writer.WriteXmlElement("priority", "0.9");
                writer.WriteEndElement();
            }

            writer.WriteEndElement(); // urlset
            writer.WriteEndDocument();
            await writer.FlushAsync();
        }

        var xmlString = Encoding.UTF8.GetString(memoryStream.ToArray());
        return Content(xmlString, "application/xml", Encoding.UTF8);
    }

    /// <summary>
    /// Generates dynamic robots.txt directing search engine crawlers to sitemap.xml.
    /// </summary>
    [HttpGet("robots.txt")]
    [AllowAnonymous]
    [Produces("text/plain")]
    public IActionResult GetRobotsTxt()
    {
        var sb = new StringBuilder();
        sb.AppendLine("User-agent: *");
        sb.AppendLine("Allow: /");
        sb.AppendLine("Disallow: /admin/");
        sb.AppendLine("Disallow: /api/admin/");
        sb.AppendLine();
        sb.AppendLine("Sitemap: https://eventland.pk/sitemap.xml");

        return Content(sb.ToString(), "text/plain", Encoding.UTF8);
    }
}

internal static class XmlWriterExtensions
{
    public static void WriteXmlElement(this XmlWriter writer, string localName, string value)
    {
        writer.WriteStartElement(localName);
        writer.WriteString(value);
        writer.WriteEndElement();
    }
}
