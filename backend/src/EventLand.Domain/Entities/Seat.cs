namespace EventLand.Domain.Entities;

using EventLand.Domain.Common;
using EventLand.Domain.Enums;
using EventLand.Domain.StateMachines;

/// <summary>
/// An individual seat within a SeatingZone grid.
/// Uses 4-digit integer ID scheme.
/// </summary>
public class Seat : BaseEntity
{
    public int ZoneId { get; set; }
    public SeatingZone Zone { get; set; } = null!;

    public int Row { get; set; }
    public int Col { get; set; }
    public string Label { get; set; } = string.Empty; // e.g. "A1", "B5"
    public decimal? Price { get; set; }

    private SeatState _state = SeatState.Available;
    public SeatState State
    {
        get => _state;
        set
        {
            _state = value;
            _status = MapStateToStatus(value);
        }
    }

    private SeatStatus _status = SeatStatus.Available;
    public SeatStatus Status
    {
        get => _status;
        set
        {
            _status = value;
            if (!(value == SeatStatus.Blocked && _state == SeatState.Maintenance))
            {
                _state = MapStatusToState(value);
            }
        }
    }

    // Navigation
    public ICollection<BookingSeat> BookingSeats { get; set; } = new List<BookingSeat>();

    public void Reserve(DateTimeOffset now) => TransitionTo(SeatState.TemporarilyHeld, SeatStateMachine.TriggerReserve, now);
    public void Book(DateTimeOffset now) => TransitionTo(SeatState.Booked, SeatStateMachine.TriggerBook, now);
    public void Release(DateTimeOffset now) => TransitionTo(SeatState.Available, SeatStateMachine.TriggerRelease, now);
    public void Block(DateTimeOffset now) => TransitionTo(SeatState.Blocked, SeatStateMachine.TriggerBlock, now);
    public void Unblock(DateTimeOffset now) => TransitionTo(SeatState.Available, SeatStateMachine.TriggerUnblock, now);
    public void EnterMaintenance(DateTimeOffset now) => TransitionTo(SeatState.Maintenance, SeatStateMachine.TriggerEnterMaintenance, now);
    public void ExitMaintenance(DateTimeOffset now) => TransitionTo(SeatState.Available, SeatStateMachine.TriggerExitMaintenance, now);

    private void TransitionTo(SeatState target, string trigger, DateTimeOffset now)
    {
        SeatStateMachine.ValidateTransition(_state, target, trigger);
        if (_state == target)
            return;

        State = target;
        UpdatedAt = now;
    }

    private static SeatStatus MapStateToStatus(SeatState state) => state switch
    {
        SeatState.Available => SeatStatus.Available,
        SeatState.TemporarilyHeld => SeatStatus.Reserved,
        SeatState.Booked => SeatStatus.Booked,
        SeatState.Blocked or SeatState.Maintenance => SeatStatus.Blocked,
        _ => SeatStatus.Available
    };

    private static SeatState MapStatusToState(SeatStatus status) => status switch
    {
        SeatStatus.Available => SeatState.Available,
        SeatStatus.Reserved => SeatState.TemporarilyHeld,
        SeatStatus.Booked => SeatState.Booked,
        SeatStatus.Blocked => SeatState.Blocked,
        _ => SeatState.Available
    };
}
