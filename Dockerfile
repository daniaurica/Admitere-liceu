FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    apache2 \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/admitere

COPY . .

RUN make
RUN chmod +x cgi-bin/*.cgi
RUN chmod -R 777 data

RUN a2enmod cgi

RUN cat > /etc/apache2/sites-available/000-default.conf <<'EOF'
<VirtualHost *:${PORT}>
    DocumentRoot /var/www/admitere/public

    <Directory /var/www/admitere/public>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ScriptAlias /cgi-bin/ /var/www/admitere/cgi-bin/

    <Directory /var/www/admitere/cgi-bin/>
        Options +ExecCGI
        AddHandler cgi-script .cgi
        Require all granted
    </Directory>

    ErrorLog /proc/self/fd/2
    CustomLog /proc/self/fd/1 combined
</VirtualHost>
EOF

RUN sed -i 's/Listen 80/Listen ${PORT}/' /etc/apache2/ports.conf

EXPOSE 8080

CMD ["sh", "-c", "export PORT=${PORT:-8080} && envsubst < /etc/apache2/sites-available/000-default.conf > /tmp/000-default.conf && cp /tmp/000-default.conf /etc/apache2/sites-available/000-default.conf && sed -i \"s/Listen .*/Listen ${PORT}/\" /etc/apache2/ports.conf && apachectl -D FOREGROUND"]
