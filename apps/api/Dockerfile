FROM golang:1.27-alpine AS build

WORKDIR /app

COPY go.mod ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api .

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata

COPY --from=build /out/api /usr/local/bin/api

EXPOSE 3001

ENTRYPOINT ["api"]