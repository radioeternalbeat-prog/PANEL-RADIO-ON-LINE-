FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends icecast2 ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/icecast2 \
    && chown -R nobody:nogroup /var/log/icecast2

COPY icecast.xml /etc/icecast2/icecast.xml

EXPOSE 8000
USER nobody
CMD ["icecast2", "-c", "/etc/icecast2/icecast.xml"]
