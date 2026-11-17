namespace EventLand.Domain.Exceptions;

public class InvalidStateTransitionException : InvalidOperationException
{
    public string EntityName { get; }
    public string FromState { get; }
    public string ToState { get; }
    public string Trigger { get; }

    public InvalidStateTransitionException(string entityName, string fromState, string toState, string trigger, string? message = null)
        : base(message ?? $"Invalid state transition on {entityName}: cannot transition from '{fromState}' to '{toState}' via trigger '{trigger}'.")
    {
        EntityName = entityName;
        FromState = fromState;
        ToState = toState;
        Trigger = trigger;
    }
}
