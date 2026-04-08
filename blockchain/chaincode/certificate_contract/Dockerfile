# Multi-stage build for CCaaS chaincode deployment
# Builds the chaincode binary using vendored dependencies,
# then creates a minimal runtime image

FROM golang:1.23-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /chaincode
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o /chaincode-binary .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates

COPY --from=builder /chaincode-binary /usr/local/bin/chaincode

ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999

EXPOSE 9999

CMD ["chaincode"]
