namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedOnAdd();

        builder.Property(t => t.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(t => t.Slug)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(t => t.Slug)
               .IsUnique()
               .HasDatabaseName("IX_Tags_Slug");

        builder.HasQueryFilter(t => !t.IsDeleted);
    }
}
