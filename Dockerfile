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

RUN a2enmod cgi

RUN cat > /etc/apache2/sites-available/000-default.conf <<'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/admitere/public

    <Directory /var/www/admitere/public>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ScriptAlias /cgi-bin/ /var/www/admitere/cgi-bin/

    <Directory /var/www/admitere/cgi-bin>
        Options +ExecCGI
        AddHandler cgi-script .cgi
        Require all granted
    </Directory>
</VirtualHost>
EOF

EXPOSE 80

CMD ["apachectl", "-D", "FOREGROUND"]
