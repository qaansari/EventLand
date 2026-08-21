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
               .HasDatabaseName("IX_Users_Email");

        builder.Property(u => u.FullName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(u => u.PasswordHash)
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(u => u.PhoneNumber)
               .HasMaxLength(20);

        builder.HasOne(u => u.Role)
               .WithMany(r => r.Users)
               .HasForeignKey(u => u.RoleId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(u => !u.IsDeleted);
    }
}
