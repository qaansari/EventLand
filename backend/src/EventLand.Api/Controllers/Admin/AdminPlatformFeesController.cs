namespace EventLand.Api.Controllers.Admin;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventLand.Application.Common;
using EventLand.Application.Common.Interfaces;
using EventLand.Application.Dtos;
using EventLand.Application.Services;
using EventLand.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/admin/platform-fees")]
[Authorize(Roles = AppRoles.AdminOrSuperAdmin)]
public class AdminPlatformFeesController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IPaymentFeeService _paymentFeeService;

    public AdminPlatformFeesController(
        IApplicationDbContext context,
        IPaymentFeeService paymentFeeService)
    {
        _context = context;
        _paymentFeeService = paymentFeeService;
    }

    /// <summary>
    /// Gets all platform fee tiers, ordered by SortOrder.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<PlatformFeeConfigDto>>> GetAllTiers()
    {
        var tiers = await _context.PlatformFeeConfigs
            .AsNoTracking()
            .Where(t => !t.IsDeleted)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.MinSubtotal)
            .Select(t => new PlatformFeeConfigDto(
                t.Id,
                t.Name,
                t.MinSubtotal,
                t.MaxSubtotal,
                t.FeeAmount,
                t.IsActive,
                t.SortOrder,
                t.Description,
                t.CreatedAt,
                t.UpdatedAt
            ))
            .ToListAsync();

        return Ok(tiers);
    }

    /// <summary>
    /// Gets a single platform fee tier by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlatformFeeConfigDto>> GetTierById(int id)
    {
        var tier = await _context.PlatformFeeConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (tier == null)
            return NotFound(new { message = $"Platform fee tier with ID '{id}' not found." });

        return Ok(new PlatformFeeConfigDto(
            tier.Id,
            tier.Name,
            tier.MinSubtotal,
            tier.MaxSubtotal,
            tier.FeeAmount,
            tier.IsActive,
            tier.SortOrder,
            tier.Description,
            tier.CreatedAt,
            tier.UpdatedAt
        ));
    }

    /// <summary>
    /// Creates a new platform fee tier.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<PlatformFeeConfigDto>> CreateTier([FromBody] CreatePlatformFeeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tier name is required." });

        if (dto.MinSubtotal < 0)
            return BadRequest(new { message = "Minimum subtotal cannot be negative." });

        if (dto.FeeAmount < 0)
            return BadRequest(new { message = "Fee amount cannot be negative." });

        if (dto.MaxSubtotal.HasValue && dto.MaxSubtotal.Value < dto.MinSubtotal)
            return BadRequest(new { message = "Maximum subtotal cannot be less than minimum subtotal." });

        var entity = new PlatformFeeConfig
        {
            Name = dto.Name.Trim(),
            MinSubtotal = dto.MinSubtotal,
            MaxSubtotal = dto.MaxSubtotal,
            FeeAmount = dto.FeeAmount,
            IsActive = dto.IsActive,
            SortOrder = dto.SortOrder,
            Description = dto.Description?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.PlatformFeeConfigs.Add(entity);
        await _context.SaveChangesAsync();

        var resultDto = new PlatformFeeConfigDto(
            entity.Id,
            entity.Name,
            entity.MinSubtotal,
            entity.MaxSubtotal,
            entity.FeeAmount,
            entity.IsActive,
            entity.SortOrder,
            entity.Description,
            entity.CreatedAt,
            entity.UpdatedAt
        );

        return CreatedAtAction(nameof(GetTierById), new { id = entity.Id }, resultDto);
    }

    /// <summary>
    /// Updates an existing platform fee tier.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<PlatformFeeConfigDto>> UpdateTier(int id, [FromBody] UpdatePlatformFeeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tier name is required." });

        if (dto.MinSubtotal < 0)
            return BadRequest(new { message = "Minimum subtotal cannot be negative." });

        if (dto.FeeAmount < 0)
            return BadRequest(new { message = "Fee amount cannot be negative." });

        if (dto.MaxSubtotal.HasValue && dto.MaxSubtotal.Value < dto.MinSubtotal)
            return BadRequest(new { message = "Maximum subtotal cannot be less than minimum subtotal." });

        var tier = await _context.PlatformFeeConfigs
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (tier == null)
            return NotFound(new { message = $"Platform fee tier with ID '{id}' not found." });

        tier.Name = dto.Name.Trim();
        tier.MinSubtotal = dto.MinSubtotal;
        tier.MaxSubtotal = dto.MaxSubtotal;
        tier.FeeAmount = dto.FeeAmount;
        tier.IsActive = dto.IsActive;
        tier.SortOrder = dto.SortOrder;
        tier.Description = dto.Description?.Trim();
        tier.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new PlatformFeeConfigDto(
            tier.Id,
            tier.Name,
            tier.MinSubtotal,
            tier.MaxSubtotal,
            tier.FeeAmount,
            tier.IsActive,
            tier.SortOrder,
            tier.Description,
            tier.CreatedAt,
            tier.UpdatedAt
        ));
    }

    /// <summary>
    /// Toggles the active status of a platform fee tier.
    /// </summary>
    [HttpPatch("{id:int}/toggle")]
    public async Task<ActionResult<PlatformFeeConfigDto>> ToggleTierStatus(int id)
    {
        var tier = await _context.PlatformFeeConfigs
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (tier == null)
            return NotFound(new { message = $"Platform fee tier with ID '{id}' not found." });

        tier.IsActive = !tier.IsActive;
        tier.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new PlatformFeeConfigDto(
            tier.Id,
            tier.Name,
            tier.MinSubtotal,
            tier.MaxSubtotal,
            tier.FeeAmount,
            tier.IsActive,
            tier.SortOrder,
            tier.Description,
            tier.CreatedAt,
            tier.UpdatedAt
        ));
    }

    /// <summary>
    /// Soft deletes a platform fee tier.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTier(int id)
    {
        var tier = await _context.PlatformFeeConfigs
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (tier == null)
            return NotFound(new { message = $"Platform fee tier with ID '{id}' not found." });

        tier.IsDeleted = true;
        tier.DeletedAt = DateTimeOffset.UtcNow;
        tier.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Platform fee tier '{tier.Name}' deleted successfully." });
    }

    /// <summary>
    /// Simulates/previews fee evaluation for an arbitrary test subtotal.
    /// </summary>
    [HttpPost("preview")]
    public async Task<ActionResult<PlatformFeePreviewResponseDto>> PreviewFee([FromBody] PlatformFeePreviewRequestDto request)
    {
        if (request.Subtotal < 0)
            return BadRequest(new { message = "Subtotal cannot be negative." });

        var fee = await _paymentFeeService.CalculatePlatformFeeAsync(request.Subtotal);

        // Find which tier matched
        var matchedTier = await _context.PlatformFeeConfigs
            .AsNoTracking()
            .Where(t => t.IsActive && !t.IsDeleted)
            .OrderBy(t => t.SortOrder)
            .FirstOrDefaultAsync(t => request.Subtotal >= t.MinSubtotal &&
                (!t.MaxSubtotal.HasValue || request.Subtotal <= t.MaxSubtotal.Value));

        return Ok(new PlatformFeePreviewResponseDto(
            Subtotal: request.Subtotal,
            EvaluatedFee: fee,
            MatchedTierId: matchedTier?.Id,
            MatchedTierName: matchedTier?.Name ?? "Default Fallback Tier"
        ));
    }
}

