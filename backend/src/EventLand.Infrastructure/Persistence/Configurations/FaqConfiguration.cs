namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class FaqConfiguration : IEntityTypeConfiguration<Faq>
{
    public void Configure(EntityTypeBuilder<Faq> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).ValueGeneratedOnAdd();

        builder.Property(f => f.Question)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(f => f.Answer)
               .IsRequired()
               .HasMaxLength(4000);

        builder.Property(f => f.DisplayOrder)
               .HasDefaultValue(0);

        builder.Property(f => f.IsActive)
               .HasDefaultValue(true);

        builder.Property(f => f.IsDeleted)
               .HasDefaultValue(false);

        builder.HasIndex(f => new { f.IsActive, f.DisplayOrder })
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_Faqs_Active_DisplayOrder");
    }
}
