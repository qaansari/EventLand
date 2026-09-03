namespace EventLand.Infrastructure.Persistence.Configurations;

using EventLand.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).ValueGeneratedOnAdd();

        builder.Property(u => u.Email)
               .IsRequired()
               .HasMaxLength(320);

        builder.HasIndex(u => u.Email)
               .IsUnique()
               .HasFilter("[IsDeleted] = 0")
               .HasDatabaseName("IX_Users_Email");

        builder.Property(u => u.FullName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(u => u.PasswordHash)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(u => u.PhoneNumber)
               .HasMaxLength(20);

        builder.HasIndex(u => u.PhoneNumber)
               .IsUnique()
               .HasFilter("[IsDeleted] = 0 AND [PhoneNumber] IS NOT NULL")
               .HasDatabaseName("IX_Users_PhoneNumber");

        builder.Property(u => u.ImageUrl)
               .HasMaxLength(500);

        builder.HasOne(u => u.Role)
               .WithMany(r => r.Users)
               .HasForeignKey(u => u.RoleId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(u => u.Country)
               .WithMany()
               .HasForeignKey(u => u.CountryId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(u => !u.IsDeleted);
    }
}
