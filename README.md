# Mismo Messaging System
The Mismo Messaging System is a complete Email hosting package, written for NodeJS, that comprises
three modules: 
- the SMTP Engine, which accepts inbound SMTP connections
- the qProcessor, which attempts to deliver queued messages, -and-
- the front-end load-balancer (optional).

Additionally, a webmail client, will be developed to access emails stored in the
Mismo Messaging System (i.e., via MongoDB ODM instead of POP3/IMAP).  The only requirement of the
webmail application is that it be written in PHP.

# Architecture
The *Mismo Messaging System* is designed to be *fast!*  Code supporting functionality that we
do not need has been stripped.  Both the SMTP Engine and the qProcessor are designed to take
full advantage of today's multi-core CPUs; 
The *Mismo Messaging System* has decoupled the receipt/queueing of inbound messages (via SMTP)
from the delivery of said messages (local or otherwise).  This allows you to scale up SMTP 
Engines and/or qProcessors independently, depending on your traffic patterns.

Using MongoDB as the message store permits many great features.  First and foremost, the sharding
capability of MongoDB allows you to scale the database to any size.  Second, by storing nearly
everything in the database (messages, list of domains, mailboxes, users, etc.), we can easily
cluster SMTP Engines and/or qProcessors.  Third, storing all of the messages in MongoDB allows
us to create a simple, elegant webmail system for accessing/sending of messages.


### load-balancer
An optional front-end load-balancer to distribute inbound SMTP requests via custom logic.
Should provide support for the round-robin, least-connections, least-messages, least-load-avg,
and ipHash methods of load-balancing.

**TODO:**
Figure out how to store the pool configurations (yaml, js, xml, etc?) for start-up.

The SMTP Engine provides a JSON-speaking endpoint - typically on tcp port 3005 - that the
load-balancer can query and use to make routing decisions.

> http://xx.xx.xx.xx:3005/status

> http://xx.xx.xx.xx:3005/status/detail



### SMTP Engine
Each of the SMTP Engine hosts will start the SMTP Engine as follows:

> nodejs smtp-engine.js

The SMTP Engine accepts SMTP connections from the global Internet, speaking just enough of the
SMTP protocol to accept an inbound message and to store it in the MongoDB Cluster (in the
'messages' collection with **document.state = 'ENQUEUED'**).

The SMTP Engine can be configured for a maximum number of simultaneous connections by setting the
> SMTP_MAX_CLIENTS and/or SMTP_MAX_CLIENTS_PER_HOST

tunables in the $Mismo/.env file.  SMTP_MAX_CLIENTS specifies the maximum number of established
connections that we permit; we return a 421 Too Many Connections if exceeded.  SMTP_MAX_CLIENTS_PER_HOST
specifies the maximum number of established connections we can have *per client IP address.*
We also return a 421 Too Many Connections when the per-host limit is exceeded.


### qProcessor
Each of the qProcessor hosts will start the qProcessor as follows:

> nodejs qProcessor.js

The qProcessor queries MongoDB for any messages awaiting delivery (**document.state == 'ENQUEUED'**)
and attempts to deliver them.  To do so, the qProcessor application fires off the
> qProcessor.processQueue()

function at a configurable interval.  The default is 30 seconds.

First, a call on DNS obtains the MX record for the receiver's domain.
If multiple MX hosts are provided by DNS, a connection will be attempted to each in *ascending* order
of MX weight.


# Installation
1. Download the source code for Mismo Messaging System from GitHub:

> git clone https://github.com/tjeaster81/Mismo.git

2. Run the `npm install` command:

> (root@hostname) /root/src/Mismo# npm install

3. Edit the $MISMO/.env environment file; change any variable definitions to match your environment.

> (root@hostname) /root/src/Mismo# $EDITOR .env

4. Decide whether the host in question is going to be an SMTP Engine or a qProcessor (or both!)
For SMTP Engine:

> (root@hostname) /root/src/Mismo/bin# $EDITOR localDomains.txt
> (root@hostname) /root/src/Mismo/bin# node setLocalDomaims.js
> (root@hostname) /root/src/Mismo# node smtp-engine.js

For qProcessor:

> (root@hostname) /root/src/Mismo# node qProcessor.js




