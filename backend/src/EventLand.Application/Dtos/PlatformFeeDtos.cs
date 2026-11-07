namespace EventLand.Application.Dtos;

using System;

public record PlatformFeeConfigDto(
    int Id,
    string Name,
    decimal MinSubtotal,
    decimal? MaxSubtotal,
    decimal FeeAmount,
    bool IsActive,
    int SortOrder,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CreatePlatformFeeDto(
    string Name,
    decimal MinSubtotal,
    decimal? MaxSubtotal,
    decimal FeeAmount,
    bool IsActive = true,
    int SortOrder = 0,
    string? Description = null
);

public record UpdatePlatformFeeDto(
    string Name,
    decimal MinSubtotal,
    decimal? MaxSubtotal,
    decimal FeeAmount,
    bool IsActive,
    int SortOrder,
    string? Description = null
);

public record PlatformFeePreviewRequestDto(
    decimal Subtotal
);

public record PlatformFeePreviewResponseDto(
    decimal Subtotal,
    decimal EvaluatedFee,
    int? MatchedTierId,
    string? MatchedTierName
);

