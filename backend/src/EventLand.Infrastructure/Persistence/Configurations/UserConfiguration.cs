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

        builder.HasOne(u => u.Organizer)
               .WithMany(o => o.Users)
               .HasForeignKey(u => u.OrganizerId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(u => u.OrganizerId)
               .HasDatabaseName("IX_Users_OrganizerId");

        // Social auth configuration & unique sparse indexes
        builder.Property(u => u.GoogleId)
               .HasMaxLength(128);

        builder.HasIndex(u => u.GoogleId)
               .IsUnique()
               .HasFilter("[IsDeleted] = 0 AND [GoogleId] IS NOT NULL")
               .HasDatabaseName("IX_Users_GoogleId");

        builder.Property(u => u.FacebookId)
               .HasMaxLength(128);

        builder.HasIndex(u => u.FacebookId)
               .IsUnique()
               .HasFilter("[IsDeleted] = 0 AND [FacebookId] IS NOT NULL")
               .HasDatabaseName("IX_Users_FacebookId");

        builder.Property(u => u.AuthProvider)
               .IsRequired()
               .HasMaxLength(32)
               .HasDefaultValue("local");
    }
}
