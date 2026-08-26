namespace EventLand.Api.Controllers;

using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
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
        var footer = await _context.FooterInfos.AsNoTracking().FirstOrDefaultAsync();
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
}
