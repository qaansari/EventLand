namespace EventLand.Application.Dtos;

public record RoleDto(
    int Id,
    string Name,
    string Description
);

public record CreateRoleDto(
    string Name,
    string Description
);

public record UpdateRoleDto(
    string Name,
    string Description
);
