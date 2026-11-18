namespace EventLand.Domain.Enums;

public enum TicketScanState
{
    Issued = 0,
    ScannedAndAdmitted = 1,
    Revoked = 2,
    InvalidShowSlot = 3
}
