namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class FooterInfoConfiguration : IEntityTypeConfiguration<FooterInfo>
{
    public void Configure(EntityTypeBuilder<FooterInfo> builder)
    {
        builder.ToTable("FooterInfo");
        builder.HasKey(f => f.Id);
    }
}
