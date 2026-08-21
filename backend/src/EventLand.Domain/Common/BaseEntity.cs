namespace EventLand.Domain.Common;

/// <summary>
/// Generic base entity supporting custom Primary Key types (int, Guid, etc.),
/// full audit trail (CreatedAt, UpdatedAt, CreatedBy, UpdatedBy),
/// and soft-delete support (IsDeleted, DeletedAt).
/// </summary>
public abstract class BaseEntity<TKey>
{
    public TKey Id { get; set; } = default!;

    // --- Audit fields ---
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // --- Soft delete ---
    public bool IsDeleted { get; set; } = false;
    public DateTimeOffset? DeletedAt { get; set; }
}

/// <summary>
/// Default base entity using 4-digit integer Primary Key (int).
/// </summary>
public abstract class BaseEntity : BaseEntity<int>
{
}
