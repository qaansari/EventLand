namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedOnAdd();

        builder.Property(r => r.Name)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(r => r.Name)
               .IsUnique()
               .HasDatabaseName("IX_Roles_Name");

        builder.Property(r => r.Description)
               .HasMaxLength(200);

        builder.HasMany(r => r.Users)
               .WithOne(u => u.Role)
               .HasForeignKey(u => u.RoleId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}
