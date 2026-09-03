namespace EventLand.Api.Controllers;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class FaqsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cacheService;

    public FaqsController(IApplicationDbContext context, ICacheService cacheService)
    {
        _context = context;
        _cacheService = cacheService;
    }

    [HttpGet]
    public async Task<IActionResult> GetFaqs()
    {
        const string cacheKey = "public:faqs";
        var cached = await _cacheService.GetAsync<List<object>>(cacheKey);
        if (cached != null) return Ok(cached);

        var faqs = await _context.Faqs
            .AsNoTracking()
            .Where(f => f.IsActive && !f.IsDeleted)
            .OrderBy(f => f.DisplayOrder)
            .Select(f => (object)new
            {
                f.Id,
                q = f.Question,
                a = f.Answer,
                f.DisplayOrder
            })
            .ToListAsync();

        await _cacheService.SetAsync(cacheKey, faqs, TimeSpan.FromMinutes(15));
        return Ok(faqs);
    }
}
