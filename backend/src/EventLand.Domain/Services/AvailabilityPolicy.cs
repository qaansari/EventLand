namespace EventLand.Domain.Services;

using System;
using EventLand.Domain.Entities;
using EventLand.Domain.Enums;

public record AvailabilityResult(
    AvailabilityStatus Status,
    bool IsBookable,
    string Code,
    string Reason
);

public static class AvailabilityPolicy
{
    public static AvailabilityResult Evaluate(Event? ev, EventShow? show, TicketTier? tier, DateTimeOffset now)
    {
        // 1. Event Level Validation
        if (ev != null)
        {
            if (ev.IsDeleted)
                return new AvailabilityResult(AvailabilityStatus.NotPublished, false, "EVENT_NOT_FOUND", "The event could not be found or has been removed.");

            if (!ev.IsPublished)
                return new AvailabilityResult(AvailabilityStatus.NotPublished, false, "NOT_PUBLISHED", "The event is currently unpublished.");

            if (ev.Status == EventStatus.Upcoming)
                return new AvailabilityResult(AvailabilityStatus.NotYetOnSale, false, "NOT_YET_ON_SALE", $"Event '{ev.Title}' tickets are not yet on sale.");

            if (ev.Status == EventStatus.Closed)
                return new AvailabilityResult(AvailabilityStatus.EventClosed, false, "EVENT_CLOSED", $"Event '{ev.Title}' is closed and no longer accepting bookings.");

            if (ev.EndDateUtc != default && now > ev.EndDateUtc)
                return new AvailabilityResult(AvailabilityStatus.SaleEnded, false, "SALE_ENDED", $"Event '{ev.Title}' has concluded.");
        }

        // 2. Show Level Validation (if show slot is specified or linked to tier)
        var targetShow = show ?? tier?.EventShow;
        if (targetShow != null)
        {
            if (targetShow.IsDeleted)
                return new AvailabilityResult(AvailabilityStatus.ShowDeleted, false, "SHOW_DELETED", "The show slot is no longer available.");

            if (targetShow.IsClosed)
                return new AvailabilityResult(AvailabilityStatus.ShowClosed, false, "SHOW_CLOSED", $"Show '{targetShow.ShowTitle}' is closed.");

            if (targetShow.EndTimeUtc != default && now > targetShow.EndTimeUtc)
                return new AvailabilityResult(AvailabilityStatus.SaleEnded, false, "SHOW_CONCLUDED", $"Show '{targetShow.ShowTitle}' has concluded.");
        }

        // 3. Ticket Tier Level Validation
        if (tier is null || tier.IsDeleted)
            return new AvailabilityResult(AvailabilityStatus.TierClosed, false, "TIER_NOT_FOUND", "The ticket tier could not be found.");

        if (tier.Status == TicketTierStatus.Closed)
            return new AvailabilityResult(AvailabilityStatus.TierClosed, false, "TIER_CLOSED", $"Ticket tier '{tier.Name}' is closed.");

        if (tier.Status == TicketTierStatus.SoldOut || tier.AvailableQuantity <= tier.SoldCount || tier.AvailableQuantity <= 0)
            return new AvailabilityResult(AvailabilityStatus.SoldOut, false, "SOLD_OUT", $"Ticket tier '{tier.Name}' is sold out.");

        return new AvailabilityResult(AvailabilityStatus.Bookable, true, "AVAILABLE", "Ticket tier is open and available for booking.");
    }
}
