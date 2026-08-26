namespace EventLand.Api.Controllers.Admin;

using System;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common.Interfaces;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record CreateFaqDto(string Question, string Answer, int DisplayOrder = 0);
public record UpdateFaqDto(string Question, string Answer, int DisplayOrder = 0, bool IsActive = true);

[ApiController]
[Route("api/admin/faqs")]
public class AdminFaqsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AdminFaqsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllFaqs()
    {
        var list = await _context.Faqs
            .AsNoTracking()
            .Where(f => !f.IsDeleted)
            .OrderBy(f => f.DisplayOrder)
            .Select(f => new { f.Id, q = f.Question, a = f.Answer, f.DisplayOrder, f.IsActive })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateFaq([FromBody] CreateFaqDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Question) || string.IsNullOrWhiteSpace(dto.Answer))
        {
            return BadRequest("Question and Answer are required.");
        }

        var faq = new Faq
        {
            Question = dto.Question.Trim(),
            Answer = dto.Answer.Trim(),
            DisplayOrder = dto.DisplayOrder,
            IsActive = true
        };

        _context.Faqs.Add(faq);
        await _context.SaveChangesAsync();

        return Ok(new { faq.Id, q = faq.Question, a = faq.Answer, faq.DisplayOrder, faq.IsActive });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateFaq(int id, [FromBody] UpdateFaqDto dto)
    {
        var faq = await _context.Faqs.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
        if (faq == null) return NotFound("FAQ not found.");

        faq.Question = dto.Question.Trim();
        faq.Answer = dto.Answer.Trim();
        faq.DisplayOrder = dto.DisplayOrder;
        faq.IsActive = dto.IsActive;
        faq.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { faq.Id, q = faq.Question, a = faq.Answer, faq.DisplayOrder, faq.IsActive });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteFaq(int id)
    {
        var faq = await _context.Faqs.FirstOrDefaultAsync(f => f.Id == id && !f.IsDeleted);
        if (faq == null) return NotFound("FAQ not found.");

        faq.IsDeleted = true;
        faq.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }
}
