namespace EventLand.Application.Dtos;

using System.Text.Json.Serialization;

/// <summary>
/// Generic pagination wrapper for low-latency list queries.
/// Calculates TotalPages, HasPreviousPage, and HasNextPage automatically.
/// </summary>
public record PagedResult<T>
{
    public List<T> Items { get; init; }
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalPages { get; init; }
    public bool HasPreviousPage { get; init; }
    public bool HasNextPage { get; init; }

    public PagedResult()
    {
        Items = new List<T>();
    }

    [JsonConstructor]
    public PagedResult(
        List<T> items,
        int totalCount,
        int pageNumber,
        int pageSize,
        int totalPages,
        bool hasPreviousPage,
        bool hasNextPage)
    {
        Items = items ?? new List<T>();
        TotalCount = totalCount;
        PageNumber = pageNumber;
        PageSize = pageSize;
        TotalPages = totalPages;
        HasPreviousPage = hasPreviousPage;
        HasNextPage = hasNextPage;
    }

    public PagedResult(List<T> items, int totalCount, int pageNumber, int pageSize)
        : this(
            items,
            totalCount,
            pageNumber,
            pageSize,
            (int)Math.Ceiling(totalCount / (double)Math.Max(1, pageSize)),
            pageNumber > 1,
            pageNumber < (int)Math.Ceiling(totalCount / (double)Math.Max(1, pageSize))
        )
    {
    }
}
