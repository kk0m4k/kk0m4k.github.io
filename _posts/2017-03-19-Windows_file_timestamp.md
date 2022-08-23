---
title: "Live OS로 부팅 후, 파일 수정 시의 타임스탬프"
author: Francesco

layout: single
categories:
  - digital-forensics

author_profile: true
tags:
  - Forensics
---
Live OS를 이용하여, 윈도우 10이 설치되어 있는 데스크탑을 부팅한 후, Live OS에서 윈도우 10이 설치되어 있는 파일시스템의 특정 파일의 컨텐츠를 변경(수정) 하였을 경우, 변경된 파일의 스탬프 값을 확인하는 테스트를 수행 하였음.

```bash
- Live OS: Kali (Linux)
- 저장매체: USB
- 대상시스템: 윈도우 10 (NTFS 파일 시스템)
```

- 테스트 방식

> 기본OS(윈도우 10)로 부팅한 후, $MFT파일의 test_c.txt파일의 MACE 값을 확인($STDINFO/$FILENAME)
> Live OS로 부팅하고, 앞 단계에서 생성한 test_c.txt 파일의 내용을 수정
> 기본OS(윈도우 10)으로 부팅한 후, $MFT파일의 test_c.txt파일의 MACE 값을 확인

- 결과

> 위 1번 단계에서 test_c.txt파일의 최초 파일 생성  후, $STDINFO와 $FINENAME의 MACE값은 동일
> 2번 단계에서 test_c.txt를 Live OS에서 수정하였을 때, $FILENAME의 값은 1번단계에서 확인한 값과 동일(변경이 없었음)하지만, $STDINFO의 경우, Modified, Access, Entry 값은 수정한 당시 시간 값으로 업데이트가 됨. 단, $STDINFO의 Create는 변경되지 않음.

[그림] 1번 단계에서 확인한 값
![parse](/images/timestamp_liveos_1.png)

[그림] 3번 단계에서 확인한 값
![parse](/images/timestamp_liveos_2.png)

> 3번 단계 이후, 해당 파일을 Live OS가 아닌 윈도우 10으로 부팅 한 후에 test_c.txt 파일을 메모장에서 수정을 하면, $FILENAME 값에는 변경이 없으며, $STDINFO의 경우에는 modified와 Entry는 수정한 시간으로 셋팅이 되지만, creation는 최초 생성한 시간을 유지하며, access 시간은 3번단계에서 업데이트 시간이 유지되는 것으로 확인 됨.
> 이번 테스트와 별개로, 윈도우 10에서 DOC/PPT/EXCEL 타입의 신규 파일을 생성 후, 수정하면, $FILENAME과 $STDINFO의 값은 동일한 값으로 맞추어 짐.

> [참고] Live OS로 Kali linux를 사용하여 윈도우 10의 NTFS 파일 시스템을 마운트하는 과정에서 에러가 발생하였으며, 이는 아래와 같이 ntfsfix 명령어를 사용하여 파일시스템 체크한 후, 마운트하면 정상적으로 마운트가 됨.

```bash
root@kali:/# fdisk -l
Disk /dev/sda: 223.6 GiB, 240057409536 bytes, 468862128 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x7cf70168

Device     Boot     Start       End   Sectors   Size Id Type

/dev/sda1            2048 467937279 467935232 223.1G  7 HPFS/NTFS/exFAT
/dev/sda2       467937280 468858879    921600   450M 27 Hidden NTFS WinR



Disk /dev/sdc: 1.9 GiB, 2004877312 bytes, 3915776 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x7faa79a8

Device     Boot   Start     End Sectors  Size Id Type
/dev/sdc1  *         64 2011135 2011072  982M 17 Hidden HPFS/NTFS

/dev/sdc2       2011136 2220095  208960  102M  1 FAT12
root@kali:/# mount -t ntfs-3g /dev/sda1 /mnt/C
The disk contains an unclean file system (0, 0).
Metadata kept in Windows cache, refused to mount.
Falling back to read-only mount because the NTFS partition is in an
unsafe state. Please resume and shutdown Windows fully (no hibernation
or fast restarting.)


root@kali:/# ntfsfix /dev/sda1
Mounting volume... The disk contains an unclean file system (0, 0).
Metadata kept in Windows cache, refused to mount.
FAILED
Attempting to correct errors...
Processing $MFT and $MFTMirr...
Reading $MFT... OK
Reading $MFTMirr... OK
Comparing $MFTMirr to $MFT... OK
Processing of $MFT and $MFTMirr completed successfully.
Setting required flags on partition... OK
Going to empty the journal ($LogFile)... OK
Checking the alternate boot sector... OK
NTFS volume version is 3.1.
NTFS partition /dev/sda1 was processed successfully.


root@kali:/# mount -t ntfs-3g /dev/sda1 /mnt/C
```
