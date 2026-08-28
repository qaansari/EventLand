FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files and restore first to leverage Docker layer caching
COPY ["EventLand.Api/EventLand.Api.csproj", "EventLand.Api/"]
COPY ["EventLand.Application/EventLand.Application.csproj", "EventLand.Application/"]
COPY ["EventLand.Domain/EventLand.Domain.csproj", "EventLand.Domain/"]
COPY ["EventLand.Infrastructure/EventLand.Infrastructure.csproj", "EventLand.Infrastructure/"]
RUN dotnet restore EventLand.Api/EventLand.Api.csproj

# Copy the full source and publish
COPY . .
RUN dotnet publish EventLand.Api/EventLand.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 7257 4257
ENTRYPOINT ["dotnet", "EventLand.Api.dll"]
