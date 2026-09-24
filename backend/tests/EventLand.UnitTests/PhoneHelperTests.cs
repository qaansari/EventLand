namespace EventLand.UnitTests;

using EventLand.Application.Common;
using Xunit;

public class PhoneHelperTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("abc", null)]
    public void Normalize_NullOrInvalid_ReturnsNull(string? input, string? expected)
    {
        var result = PhoneHelper.Normalize(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    // Identical numbers with different spacing / formatting
    [InlineData("+92 331 2541767", "+923312541767")]
    [InlineData("+92 3312541767", "+923312541767")]
    [InlineData("+923312541767", "+923312541767")]
    [InlineData("+92-331-254-1767", "+923312541767")]
    [InlineData("0331 2541767", "+923312541767")]
    [InlineData("03312541767", "+923312541767")]
    [InlineData("3312541767", "+923312541767")]
    [InlineData("923312541767", "+923312541767")]
    [InlineData("+1 (555) 234-5678", "+15552345678")]
    [InlineData("+44 20 7946 0958", "+442079460958")]
    public void Normalize_VariousFormats_ReturnsCanonicalE164(string input, string expected)
    {
        var result = PhoneHelper.Normalize(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Normalize_Equivalence_SpacedAndUnspacedAreEqual()
    {
        var phone1 = "+92 331 2541767";
        var phone2 = "+92 3312541767";
        var phone3 = "03312541767";

        var norm1 = PhoneHelper.Normalize(phone1);
        var norm2 = PhoneHelper.Normalize(phone2);
        var norm3 = PhoneHelper.Normalize(phone3);

        Assert.Equal(norm1, norm2);
        Assert.Equal(norm2, norm3);
        Assert.Equal("+923312541767", norm1);
    }

    [Theory]
    [InlineData("+923312541767", "+92 331 2541767")]
    [InlineData("+92 3312541767", "+92 331 2541767")]
    [InlineData("03312541767", "+92 331 2541767")]
    [InlineData("+15552345678", "+15552345678")]
    public void FormatForDisplay_FormatsPakistanNumbers(string input, string expected)
    {
        var result = PhoneHelper.FormatForDisplay(input);
        Assert.Equal(expected, result);
    }
}
