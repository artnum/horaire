# Install

Installation with debian.

## Syslog (rsyslog)

In `/etc/rsyslog.d/20-kaal.conf` :

```
:programname,isequal,"kaal"	/var/log/kaal.log
```

## Logrotate

In ` cat /etc/logrotate.d/kaal`

```
/var/log/kaal.log {
	rotate 12
	weekly
	missingok
	notifempty
	compress
	delaycompress
}
```

## PHP

Use php >= 8.2 with following modules :

  - curl
  - gd
  - intl
  - ldap
  - mbstring
  - memcached
  - mysqli
  - mysqlnd
  - pcre
  - PDO
  - pdo_mysql
  - redis
  - shmop
  - sockets
  - sodium
  - sysvmsg
  - sysvsem
  - sysvshm
  - xml
  - xmlreader
  - xmlwriter
  - xsl
  - zip
  - zlib
