---
title: "Post: Create Time in EXT4 Filesystem of Linux"
author: Francesco

layout: single
categories:
  - digital-forensics

author_profile: true
tags:
  - Linux
  - Forensics
  - EXT4
---

# Creation Time in EXT4

Linux 운영체제에서는 파일 및 디렉터리에 대한 시간 정보를 갖고 있으며, 그 시간 정보는 Modified Time, Access Time, 그리고 Changed Time 정보이다. 일반적으로 축약해서 이야기하는 MAC이다. 하지만,  대부분의 Linux 파일시스템, EXT2/EXT3/XFS, 등의 파일 시스템에서는 파일 생성 시간(Creation Time ) 정보를 확인할 수 방법을 제공하지 않습니다. 다만, EXT4 파일 시스템 경우에는 EXT4를 확인할 수 있는 방법이 있다.

- Modified Time: 파일 컨텐츠가 수정되었을 때 업데이트 되는 시간을 의미 함.
- Accessed Time: 파일 열람으로 인하여 업데이트 되는 시간 정보
- Changed Time: 파일과 관련된 Meta 정보가 변경되었을 때 변경되는 시간을 의미 함.

파일 생성 날짜를 확인하기 위하여 wget 명령어를 사용하여 인터넷에 있는 파일을 다운로드 받는다. wget 명령어 옵셥으로 -S를 주게 되면, 헤더 정보에서 Last-Modified 시간 정보를 확인할 수 있다. 이 시간 정보가 이 파일이 Linux 시스템에 생성되었을 때, Modify 시간 정보를 의미 한다.

```bash
# wget -S https://download.sysinternals.com/files/Sysmon.zip
--2020-07-09 23:19:31--  https://download.sysinternals.com/files/Sysmon.zip
Resolving download.sysinternals.com (download.sysinternals.com)... 117.18.232.200
Connecting to download.sysinternals.com (download.sysinternals.com)|117.18.232.200|:443... connected.
HTTP request sent, awaiting response... 200 OK
Accept-Ranges: bytes
  Age: 111660
  Content-MD5: /AkL5pWyeeVHU98IEMIV+w==
  Content-Type: application/octet-stream
  Date: Thu, 09 Jul 2020 14:42:25 GMT
  Etag: 0x8D8180E140112D8
  Last-Modified: Wed, 24 Jun 2020 07:13:21 GMT
  Server: ECAcc (tka/892D)
  X-Cache: HIT
  x-ms-blob-type: BlockBlob
  x-ms-lease-status: unlocked
  x-ms-request-id: 9e86fe51-401e-00c3-06fb-54feaf000000
  x-ms-version: 2009-09-19
  Content-Length: 1810423
Length: 1810423 (1.7M) [application/octet-stream]

Saving to: ‘Sysmon.zip’

Sysmon.zip  100%[=========================>]   1.73M  4.53MB/s    in 0.4s    

2020-07-09 23:19:32 (4.53 MB/s) - ‘Sysmon.zip’ saved [1810423/1810423]
```

ls 명령어를 사용하여 다운로드 완료된 파일을 확인한다. ls 명령어는 다양한 옵션을 제공하지만, Creation time 정보를 확인할 수 있는 옵션은 제공하지를 않는다. 

```bash
root@parallels-vm:~# ls -alc
total 1792
drwx------  4 root root    4096 Jul  9 23:19 .
drwxr-xr-x 24 root root    4096 Aug 10  2017 ..
-rw-r--r--  1 root root    3106 Aug 10  2017 .bashrc
drwx------  2 root root    4096 Aug 10  2017 .cache
drwx------  3 root root    4096 Jul  9 23:13 .gnupg
-rw-r--r--  1 root root     148 Aug 10  2017 .profile
-rw-r--r--  1 root root 1810423 Jul  9 23:19 Sysmon.zip
```

stat 명령어를 사용하면, Creation Time 정보가 표시되지 않는다. 다만, Birth - 로 표시되는 부분이 파일 생성 시간 정보를 표시해 주는 부분이다. 이 정보를 확인하기 위해서는 대상 파일이 존재하는 파티션에 대한 파일 시스템 정보를 확인하고, debugfs 명령어를 사용하여 디버그 모드로 진입을 해야 한다. 

```bash
# stat Sysmon.zip 
  File: 'Sysmon.zip'
  Size: 1810423   	Blocks: 3536       IO Block: 4096   regular file
Device: 801h/2049d	Inode: **2621448**     Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2020-07-09 23:19:32.000000000 +0900
Modify: 2020-06-24 16:13:21.000000000 +0900
Change: 2020-07-09 23:19:32.261487486 +0900
 **Birth: -**
```

debugfs 사용함에 있어서 필요한 대상 파일이 있는 파티션의 파일 시스템을 확인한다. 아래 명령어 수행결과를 보면, 해당 파일은 "/" 파티션에 존재하며, 이는 /dev/sad1 파일 시스템에 존재한다.

```bash
# df -h
Filesystem      Size  Used Avail Use% Mounted on
udev            472M     0  472M   0% /dev
tmpfs            99M  8.6M   91M   9% /run
/dev/sda1        62G  4.1G   55G   7% /
tmpfs           493M  252K  493M   1% /dev/shm
tmpfs           5.0M  4.0K  5.0M   1% /run/lock
tmpfs           493M     0  493M   0% /sys/fs/cgroup
Home            466G  170G  297G  37% /media/psf/Hom
```

위에서 확인한 파일시스템 정보 그리고 Inode 값을 확인한 후, 아래 처럼 debugfs 명령어를 사용한다. 그 결과는 아래에서 볼 수 있 듯이 crtime 이라고 표시된 파일 생성 시간 정보를 확인할 수 있다.

```bash
~# debugfs -R 'stat <2621448>' /dev/sda1

Inode: 2621448 Type: regular Mode: 0644 Flags: 0x80000
Generation: 3303492050 Version: 0x00000000:00000001
User: 0 Group: 0 Size: 1810423
File ACL: 0 Directory ACL: 0
Links: 1 Blockcount: 3536
Fragment: Address: 0 Number: 0 Size: 0
ctime: 0x5f072774:3e57edf8 -- Thu Jul 9 23:19:32 2020
atime: 0x5f072774:00000000 -- Thu Jul 9 23:19:32 2020
mtime: 0x5ef2fd11:00000000 -- Wed Jun 24 16:13:21 2020
crtime: 0x5f072773:d22ba90c -- Thu Jul 9 23:19:31 2020
```
