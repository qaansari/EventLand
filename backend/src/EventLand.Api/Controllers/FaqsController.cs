namespace EventLand.Api.Controllers;

using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class FaqsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public FaqsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetFaqs()
    {
        var faqs = await _context.Faqs
            .AsNoTracking()
            .Where(f => f.IsActive && !f.IsDeleted)
            .OrderBy(f => f.DisplayOrder)
            .Select(f => new
            {
                f.Id,
                q = f.Question,
                a = f.Answer,
                f.DisplayOrder
            })
            .ToListAsync();

        return Ok(faqs);
    }
}
