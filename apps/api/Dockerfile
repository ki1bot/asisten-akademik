FROM golang:1.27-alpine AS base

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

FROM base AS verify

CMD ["sh", "-c", "files=\"$(gofmt -l .)\"; if [ -n \"$files\" ]; then printf '%s\n' \"$files\"; exit 1; fi; go vet ./... && go test ./... && go build -o /tmp/api ."]

FROM base AS build

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api .

FROM alpine:3.22 AS runtime

RUN apk add --no-cache ca-certificates tzdata

COPY --from=build /out/api /usr/local/bin/api

EXPOSE 3001

ENTRYPOINT ["api"]