FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    apache2 \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/admitere

COPY . .

RUN cp public/* .

RUN make
RUN chmod +x cgi-bin/*.cgi
RUN chmod -R 777 data

RUN a2enmod cgi

RUN cat > /etc/apache2/sites-available/admitere.conf <<'EOF'
<VirtualHost *:8080>
    DocumentRoot /var/www/admitere

    <Directory /var/www/admitere>
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

RUN a2dissite 000-default.conf
RUN a2ensite admitere.conf

EXPOSE 8080

CMD sed -i "s/Listen .*/Listen ${PORT:-8080}/" /etc/apache2/ports.conf && apachectl -D FOREGROUND
