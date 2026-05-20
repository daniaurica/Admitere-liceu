FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    apache2 \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY . .

RUN cp public/* /var/www/html/

RUN make

RUN chmod +x cgi-bin/*.cgi
RUN chmod -R 777 data

RUN mkdir -p /usr/lib/cgi-bin
RUN cp cgi-bin/*.cgi /usr/lib/cgi-bin/

RUN a2enmod cgi

RUN cat > /etc/apache2/sites-available/000-default.conf <<EOF
<VirtualHost *:80>
    DocumentRoot /var/www/html

    ScriptAlias /cgi-bin/ /usr/lib/cgi-bin/

    <Directory "/usr/lib/cgi-bin">
        AllowOverride None
        Options +ExecCGI
        Require all granted
        AddHandler cgi-script .cgi
    </Directory>

    <Directory "/var/www/html">
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
EOF

EXPOSE 80

CMD apachectl -D FOREGROUND
