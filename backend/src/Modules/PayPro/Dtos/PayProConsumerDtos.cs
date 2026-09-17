namespace EventLand.Modules.PayPro.Dtos;

/// <summary>
/// Individual consumer input data for creating or updating consumers in PayPro.
/// </summary>
public record PayProConsumerInput(
    string ConsumerId,
    string Name,
    string Mobile = "",
    string Email = "",
    string Address = ""
);

/// <summary>
/// Result of single consumer create or update operation.
/// </summary>
public record PayProConsumerResult(
    bool IsSuccess,
    string Status,
    string ConsumerId,
    string? Description,
    string? RawResponseJson
);

/// <summary>
/// Result of batch consumer create or update operation.
/// </summary>
public record PayProBatchConsumerResult(
    bool IsOverallSuccess,
    string Status,
    IReadOnlyList<PayProConsumerResult> Consumers,
    string? Description,
    string? RawResponseJson
);

/// <summary>
/// DTO for frontend request to create/update a consumer.
/// </summary>
public record ConsumerRequestDto(
    string ConsumerId,
    string Name,
    string? Mobile,
    string? Email,
    string? Address
);

/// <summary>
/// Batch consumer request DTO (e.g. from CSV or multiple entry).
/// </summary>
public record BatchConsumersRequestDto(
    List<ConsumerRequestDto> Consumers
);
