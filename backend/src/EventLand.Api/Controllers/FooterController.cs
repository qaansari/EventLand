namespace EventLand.Api.Controllers;

using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class FooterController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public FooterController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetFooterInfo()
    {
        var footer = await _context.FooterInfo.AsNoTracking().FirstOrDefaultAsync();
        if (footer == null)
        {
            footer = new Domain.Entities.FooterInfo();
        }

        var faqs = await _context.Faqs
            .AsNoTracking()
            .Where(f => f.IsActive && !f.IsDeleted)
            .OrderBy(f => f.DisplayOrder)
            .Select(f => new { f.Id, q = f.Question, a = f.Answer, f.DisplayOrder })
            .ToListAsync();

        var cities = await _context.Cities
            .AsNoTracking()
            .Where(c => c.IsActive && !c.IsDeleted)
            .OrderBy(c => c.Name)
            .Select(c => c.Name)
            .ToListAsync();

        return Ok(new
        {
            brandName = footer.BrandName,
            tagline = footer.Tagline,
            phone = footer.Phone,
            email = footer.Email,
            address = footer.Address,
            copyrightText = footer.CopyrightText,
            privacyPolicyUrl = footer.PrivacyPolicyUrl,
            termsOfServiceUrl = footer.TermsOfServiceUrl,
            organizerSupportUrl = footer.OrganizerSupportUrl,
            faqs = faqs,
            majorCities = cities
        });
    }

    [HttpPut]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateFooterInfo([FromBody] UpdateFooterInfoDto dto)
    {
        var footer = await _context.FooterInfo.FirstOrDefaultAsync();
        if (footer == null)
        {
            footer = new Domain.Entities.FooterInfo();
            _context.FooterInfo.Add(footer);
        }

        if (dto.BrandName != null) footer.BrandName = dto.BrandName;
        if (dto.Tagline != null) footer.Tagline = dto.Tagline;
        if (dto.Phone != null) footer.Phone = dto.Phone;
        if (dto.Email != null) footer.Email = dto.Email;
        if (dto.Address != null) footer.Address = dto.Address;
        if (dto.CopyrightText != null) footer.CopyrightText = dto.CopyrightText;
        if (dto.PrivacyPolicyUrl != null) footer.PrivacyPolicyUrl = dto.PrivacyPolicyUrl;
        if (dto.TermsOfServiceUrl != null) footer.TermsOfServiceUrl = dto.TermsOfServiceUrl;
        if (dto.OrganizerSupportUrl != null) footer.OrganizerSupportUrl = dto.OrganizerSupportUrl;
        footer.UpdatedAt = System.DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(footer);
    }
}

public class UpdateFooterInfoDto
{
    public string? BrandName { get; set; }
    public string? Tagline { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? CopyrightText { get; set; }
    public string? PrivacyPolicyUrl { get; set; }
    public string? TermsOfServiceUrl { get; set; }
    public string? OrganizerSupportUrl { get; set; }
}
