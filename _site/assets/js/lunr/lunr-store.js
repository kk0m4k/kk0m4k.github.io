var store = [{
        "title": "디도스 악성코드의 C&C 문자열 생성 로직",
        "excerpt":"‘12.05.05 그리고 ‘12.0.510 이렇게 두 차례 디도스 공격을 유발시킨 악성코드가 있었습니다. 5.10일 악성코드는 5.5일 악성코드로 변종입니다.  5.10일 디도스 악성코드의 다양한 변종이 현재까지 출몰하고 있습니다. 이전 포스팅했던 다 수의 악성코드가 5.10일 변종으로 보입니다. 5.10일 악성코드 숙주서버(C&amp;C) 호스트 문자열 생성 로직에 대해서 분석한 자료의 이미지를 포스팅했습니다.             Game2Flood 디도스 공격 패턴.           ","categories": ["malware-analysis"],
        "tags": ["Malware"],
        "url": "/malware-analysis/DDoS_dynamic_c2_generation/",
        "teaser": null
      },{
        "title": "Vmware 가상머신 우회 악성코드",
        "excerpt":"‘12년 5월, DDoS 공격을 유발한 좀비PC에서 수집한 악성코드(32EBE2CEF738DA27B03A36E9BCB29196)는 vmware 가상머신 환경이면 실행을 종료하는 코드가 내장되어 있습니다.  알려진 vmware 가상머신 탐지 기법은 많이 있지만, 이번 악성코드는  VMwareHostOpen.exe 레지스트리 키 값을 체크하는 방식입니다.      Applications\\VMwareHostOpen.exe     Applications\\VMwareHostOpen.exe는 base64로 인코딩되어 있으며, 인코딩된 문자열은QXBwbGljYXRpb25zXFxWTXdhcmVIb3N0T3Blbi5 임.         VMwarehostopen.exe 레지스트리 체크하는 Function를 호출한 후, 그 결과 값(Vmware 환경 유무)에 대해서 바로 체크하지 않고 다른 기능을 수행한 후에 vmware 환경이면 악성코드가 종료되는 구조 임.         ","categories": ["malware-analysis"],
        "tags": ["Malware"],
        "url": "/malware-analysis/Vmware_bypass/",
        "teaser": null
      },{
        "title": "블로그 게시물을 통한 숙주서버 IP수신... ",
        "excerpt":"대부분의 숙주서버(C&amp;C) 호스트 또는 IP 정보는 악성코드 내에 하드코딩되어 있거나, 내부 연산을 통해 동적으로 생성되는 경우가 일반적입니다.  최근에 접한 악성코드 9902.exe(52F6218A2AA9DE9096727D365D53297A)는 특정 블로그 게시물 내용에 숙주서버 IP 를 전달받아서 접속하는 방식을 사용하고 있습니다. 악성코드는 ASPROTECT 2.x 버전으로 패킹되어 있었음..           blog.sina.???.cn/s/blog_a37c841a01012teh.html 게시물에 숙주서버 IP 정보가 명시되어 있음…  요렇게… Conten-Loioncat:1[199.114.243.69:9902]       숙주서버에 접속하면, 좀비PC 의 시스템정보(OS,CPU,메모리 등등) 함…    ","categories": ["malware-analysis"],
        "tags": ["Malware"],
        "url": "/malware-analysis/Populate_C2_IP_via_blog/",
        "teaser": null
      },{
        "title": "8888.exe(048FFA99E842A101651A9E4691783EED) 디도스 악성코드",
        "excerpt":"8888.exe(048FFA99E842A101651A9E4691783EED)는 8888b.pinoera.com 호스트를 숙주서버(C&amp;C)로 사용하는 디도스 악성코드입니다. Asprotect 2.x로 실행압축(패킹)되어 있으며,  악성코드는 윈도우 서비스(bbb88ijk)로 등록하여 자동 재시작하도록 되어 있습니다.  악성코드 공격 유형 및 코드를 보면, 이 전에 미리 여러차례 확인되었던 코드라서 특이 점이 없어 보입니다.       ASPROTECT 2.x 버전으로 패킹되어 있는 것을 언패킹하여 OEP를 찾은 화면   언패킹 후, IDA로 스트링 확인  숙주서버(C&amp;C) 연결 후, 공격 타겟으로 ICMP 플러딩 유발   ","categories": ["malware-analysis"],
        "tags": ["Malware"],
        "url": "/malware-analysis/malware-8888/",
        "teaser": null
      },{
        "title": "악성코드내 명시된 구글DNS 이용하여 IP Lookup 코드",
        "excerpt":"악성코드를 분석하다 보면, PC에 셋팅된 DNS 서버를 사용하지 않고 악성코드 내 명시된 DNs를 사용하는 경우가 있습니다. 아마도, DNS 싱크홀처리/블랙홀처리를 우회하기 위한 목적일 것으로 보입니다.     -rtlipv4stringtoaddress API를 사용하여 구글 DNS 8.8.8.8에 대한 IP 주소를 구함.           ","categories": ["malware-analysis"],
        "tags": ["Malware"],
        "url": "/malware-analysis/Malware_using_google_DNS/",
        "teaser": null
      },{
        "title": "Linux 악성코드: 디도스 및 백도어 기능",
        "excerpt":"디도스 및 백도어 기능이 있다고 알려진 리눅스 악성코드(Sha256: CBCCEEB358D712CDF6FA013778474876F816CCA33656BE78E5B5EB3DF24B5735). 악성코드는 Gnu C++로 작성되었으며, virustoal에 최초 등록된 시점은 2015년 12월로 확인되었음. 현재까지 virustoal에 등록된 백신제품중 33개 제품이 악성코드로 탐지된 것으로 확인 됨. 악성행위는 크게 디도스 공격 용도와 백도어 용도로 알려졌으며, 악성코드가 자동 시작되도록 init.d디렉터리에 생성 및 원본 악성코드를 ‘.sshd, find, lsof, netstat, ps’ 등등 다른 파일로 복사하는 행위가 확인 됨. 코드 분석을 위하여, IDA와  EBD를 사용하여 확인. EDB를 사용하여 진행할 때 악성코드를 데몬(daemon)프로세스로 만드는 코드가 있기 때문에, daemon함수에 대해서는 호출되지 않도록 NOP처리 하여 분석 진행.           1.악성코드 HASH정보: 다양한 변종이 있어서 해쉬 값이 다소 다를 수 있지만, 주요 핵심 코드는 유사함.               2.주요 함수: main function에서 악성코드 주요 기능을 처리 하는 MainBeikong, MainBackdoor, Mainsystool, MainMonitor 함수. 특히, MainBeikong함수는 악성코드를 데몬 프로세스로 생성, 복제, 그리고 자동시작 등록 등의 기능을 담당하는 코드로 구성되어 있음.               08062400번지에서 daemon함수를 호출하는데, daemon 프로세스는 자식 프로세스를 생성하면서, 현재 (부모)프로세스는 종료를 하기 때문에, 현재 프로세스를 대상으로 더 이상 분석 진행을 할 수 없게 됨. 코드 분석을 위하여, daemon 함수를 호출하는 영역을 NOP처리하여, 해당 함수가 호출되지 않도록 처리 함.               자동시작 관련하여, DbSecurityspt라는 파일을 /etc/init.d/ 디렉터리에 생성 함.               MainProcess: C2 서버와 통신하여, 디도스 공격과 백도어 용도의 시스템 명령 수행하는 함수. 함수 인입 지점 xpacket.ko 커널 모듈을 insmod로딩하는 코드가 있으나, xpacket.ko 파일이 존재하지 않아서 로딩 실패 함.       ","categories": ["malware-analysis"],
        "tags": ["Malware"],
        "url": "/malware-analysis/Linux_malware_backdoor/",
        "teaser": null
      },{
        "title": "SWIFT Issue...",
        "excerpt":"은행 근무 시절에 가장 핫 했던 SWIFT 이슈 관련하여, 국내 OO 기관에서 SWIFT 위협과 보안 방안에 대해서 발표 요청이 있었고, 그 당시 발표했던 자료 컨텐츠 중에 방글라데시 중앙은행 사고 관련된 장표 일부를 첨부하였습니다. 방글라데시를 포함하여, 해외 주요 은행의 SWIFT 이슈가 발생하면서, SWIFT 시스템 및 외환거래 프로세스 전반적으로 보안 점검을 수행하면서, 시스템 및 업무에 대한 이해를 할 수 있었으나, 지금은 기억 속에서 지워져 버렸음…          ","categories": ["vulnerability"],
        "tags": ["vulnerability"],
        "url": "/vulnerability/Switch_issue/",
        "teaser": null
      },{
        "title": "Live OS로 부팅 후, 파일 수정 시의 타임스탬프",
        "excerpt":"Live OS를 이용하여, 윈도우 10이 설치되어 있는 데스크탑을 부팅한 후, Live OS에서 윈도우 10이 설치되어 있는 파일시스템의 특정 파일의 컨텐츠를 변경(수정) 하였을 경우, 변경된 파일의 스탬프 값을 확인하는 테스트를 수행 하였음.   - Live OS: Kali (Linux) - 저장매체: USB - 대상시스템: 윈도우 10 (NTFS 파일 시스템)      테스트 방식       기본OS(윈도우 10)로 부팅한 후, $MFT파일의 test_c.txt파일의 MACE 값을 확인($STDINFO/$FILENAME) Live OS로 부팅하고, 앞 단계에서 생성한 test_c.txt 파일의 내용을 수정 기본OS(윈도우 10)으로 부팅한 후, $MFT파일의 test_c.txt파일의 MACE 값을 확인       결과      위 1번 단계에서 test_c.txt파일의 최초 파일 생성  후, $STDINFO와 $FINENAME의 MACE값은 동일 2번 단계에서 test_c.txt를 Live OS에서 수정하였을 때, $FILENAME의 값은 1번단계에서 확인한 값과 동일(변경이 없었음)하지만, $STDINFO의 경우, Modified, Access, Entry 값은 수정한 당시 시간 값으로 업데이트가 됨. 단, $STDINFO의 Create는 변경되지 않음.    [그림] 1번 단계에서 확인한 값    [그림] 3번 단계에서 확인한 값       3번 단계 이후, 해당 파일을 Live OS가 아닌 윈도우 10으로 부팅 한 후에 test_c.txt 파일을 메모장에서 수정을 하면, $FILENAME 값에는 변경이 없으며, $STDINFO의 경우에는 modified와 Entry는 수정한 시간으로 셋팅이 되지만, creation는 최초 생성한 시간을 유지하며, access 시간은 3번단계에서 업데이트 시간이 유지되는 것으로 확인 됨. 이번 테스트와 별개로, 윈도우 10에서 DOC/PPT/EXCEL 타입의 신규 파일을 생성 후, 수정하면, $FILENAME과 $STDINFO의 값은 동일한 값으로 맞추어 짐.       [참고] Live OS로 Kali linux를 사용하여 윈도우 10의 NTFS 파일 시스템을 마운트하는 과정에서 에러가 발생하였으며, 이는 아래와 같이 ntfsfix 명령어를 사용하여 파일시스템 체크한 후, 마운트하면 정상적으로 마운트가 됨.    root@kali:/# fdisk -l Disk /dev/sda: 223.6 GiB, 240057409536 bytes, 468862128 sectors Units: sectors of 1 * 512 = 512 bytes Sector size (logical/physical): 512 bytes / 512 bytes I/O size (minimum/optimal): 512 bytes / 512 bytes Disklabel type: dos Disk identifier: 0x7cf70168  Device     Boot     Start       End   Sectors   Size Id Type  /dev/sda1            2048 467937279 467935232 223.1G  7 HPFS/NTFS/exFAT /dev/sda2       467937280 468858879    921600   450M 27 Hidden NTFS WinR    Disk /dev/sdc: 1.9 GiB, 2004877312 bytes, 3915776 sectors Units: sectors of 1 * 512 = 512 bytes Sector size (logical/physical): 512 bytes / 512 bytes I/O size (minimum/optimal): 512 bytes / 512 bytes Disklabel type: dos Disk identifier: 0x7faa79a8  Device     Boot   Start     End Sectors  Size Id Type /dev/sdc1  *         64 2011135 2011072  982M 17 Hidden HPFS/NTFS  /dev/sdc2       2011136 2220095  208960  102M  1 FAT12 root@kali:/# mount -t ntfs-3g /dev/sda1 /mnt/C The disk contains an unclean file system (0, 0). Metadata kept in Windows cache, refused to mount. Falling back to read-only mount because the NTFS partition is in an unsafe state. Please resume and shutdown Windows fully (no hibernation or fast restarting.)   root@kali:/# ntfsfix /dev/sda1 Mounting volume... The disk contains an unclean file system (0, 0). Metadata kept in Windows cache, refused to mount. FAILED Attempting to correct errors... Processing $MFT and $MFTMirr... Reading $MFT... OK Reading $MFTMirr... OK Comparing $MFTMirr to $MFT... OK Processing of $MFT and $MFTMirr completed successfully. Setting required flags on partition... OK Going to empty the journal ($LogFile)... OK Checking the alternate boot sector... OK NTFS volume version is 3.1. NTFS partition /dev/sda1 was processed successfully.   root@kali:/# mount -t ntfs-3g /dev/sda1 /mnt/C  ","categories": ["digital-forensics"],
        "tags": ["Forensics"],
        "url": "/digital-forensics/Windows_file_timestamp/",
        "teaser": null
      },{
        "title": "ATM Malware 분석",
        "excerpt":"최근에 이슈가 된 ATM 악성코드(인터넷 샌드박스 사이트에서 다운로드 가능)가 white-listing security solution를 우회할 수 있는 기능이 있는 궁금하여 분석을 수행하고 있으며, 샘플로 받은 파일과 이 파일에서 드랍되는 3개 파일에 대해서 분석을 하고 있음.   분석한 악성코드 4개를 보면,      1.java.exe는 C2통신용도(443번 포트를 사용하지만, SSL 암호화는 하지 않음.)                     C2 IP와 통신용 포트로 443를 사용하지만, SSL로 암호화하지 않음.왠지 443포트가 외부에 허용되어 있는 정책 등을 고려하여 만든 것이 아닐까 싶음.         CMD 명령어를 사용하여 특정 프로그램을 실행하는 기능를 보유하고 있음.                  2.sample_atm.exe, javaupdate.exe, 그리고 sample_atm.exe(원래파일과 이름이 같음)는 정상적인 ATM 바이너리를 포함하고 있음.                     메시지 후킹을 담당하는 sample_atm.exe(javaupdate.exe가 드랍한 파일,MD5: 492AE026C41D516F107055E0487BE328)는 자기 자신의 다이얼로그, 메시지박스 등에서 발생한 입력값을 후킹 함. ATM기기에 맞게 후킹메시지를 처리 함.         특히, 일반적으로 setwindowshook API는 메시지 후킹을 처리하는 프로시저를 갖고 있는 별도의 DLL파일을 지정하거나, 다른 쓰레드 및 프로세스를 지정하지만, 여기서는 후킹처리 프로시저가 악성코드내에 내장되어 있으며, 후킹 처리 대상 또한 자기 자신 임. 즉, sample_atm.exe는 정상적인 atm 프로그램의 기능을 갖고 있는 것으로 추정되며, 이 악성코드의 PE헤더의 생성 날짜를 보면 2017.02월에 컴파일 된 것으로 추정 됨. 이 부부도 시사한 점이 있지만, 추정이라서 노코멘트..                      + sample_atm.exe(MD5): 4C9A343510E9B1F78E98DDC455E9AB11 + java.exe(MD5): 5C3F89ABFA560DECECF1B46994290D3F + javaupdate.exe(MD5): 34FD02BE8006614F7B1BAE4D453E19F4 + sample_atm.exe(MD5): 492AE026C41D516F107055E0487BE328             아래 이미지는 4C9A343510E9B1F78E98DDC455E9AB11와492AE026C41D516F107055E0487BE328 파일에 대해서 바이너리 비교를 한 것이며, 두 개의 파일을 보면 상단과 하단에서만 차이가 있고, 중간은 같은 코드인 것을 알 수 있고, 중간에 위치한 코드가 ATM관리 코드로 추정된다.          ","categories": ["malware-analysis"],
        "tags": ["Malware"],
        "url": "/malware-analysis/ATM_malware/",
        "teaser": null
      },{
        "title": "사고분석 관점에서 $MFT,$USNJRNL,$LOGFILE 활용",
        "excerpt":"NTFS 파일 시스템 기반의 윈도우 시스템 사고분석 과정에서 NTFS파일 시스템과 관련된 메타데이터를 수집하여 분석하는 경우가 일반적이다.   대표적인 파일로 MFT, USNJRNL, Logfile이 이에 해당된다. 막상 메타데이터를 확보 하더라도 어떤 관점에서 바라봐야 하는지 막연할 때가 있고, 자칫 중요한 아티팩트를 확보하는데 놓치는 경우가 있다.   사고분석 관점에서 의미 있는 아티팩트 항목을 정리하고자 틈틈히 내용을 정리하고 있다      파일 시간 조작 확인   특정 시간에 생성 및 삭제된 파일 정보   파일 이름 및 사이즈 정보   $DATA영역에 존재하는 데이터         ","categories": ["digital-forensics"],
        "tags": ["Forensics"],
        "url": "/digital-forensics/MFT_USNJRNL_LOG/",
        "teaser": null
      },{
        "title": "AWS EC2 디스크 이미징 및 분석 관련..",
        "excerpt":"클라우드기반 아마존 AWS EC2 서버에 대한 디스크 포렌직을 위한 이미징을 위한 방법은 생각보다 간단하며, 이미징한 파일을 다운로드 받은 후, 분석 시스템에서 포렌직 툴(예, Autopsy)로 불러오면 분석이 가능하다. 또한, 이미지를  VMDX 로 변환하여 vmware에서 라이브분석이 가능하다.           1.분석대상(이미징 대상) EC2 volume를 선택한 후 snapshot를 생성     2.위 1번 단계에서 생성한 snapshot를 가지고 volume 생성     3.2 번 단계에서 생성한 volume를 dd 포맷의 이미지를 생성할 수 있는 EC2 서버에 연결(attach)     4.3번 단계에서 attach한 volume를 대상으로 dd 명령어를 사용하여 dd 포맷으로 이미징 수행. 이미징된 파일을 로컬 분석 시스템으로 다운로드 받은데 있어서, 아웃바운드 트래픽 비용을 줄이고자, 이미지 파일을 gzip으로 압축 저장 함.         5.다운로드 받은 이미지에 대해서 압축해제한 후, Autopsy 등의 툴을 사용하여 분석     6.dd 포맷 이미지를 vmdk로 변환하여, Vmware에서 라이브 분석.         root@kali:~/Desktop# qemu-img convert -pO vmdk ./TargetAMILinux_20170913.img /TargetAMILinux_20170913.vmdk      아래 이미지는 위 5번 단계까지 진행하여, autospy로 확인한 내용 임.           vmdx로 변환된 AWS EC2 이미지 파일을 vmware에 설치하여 라이브 분석 수행 가능.         ","categories": ["digital-forensics"],
        "tags": ["Forensics"],
        "url": "/digital-forensics/AWS_EC2_dump_analysis/",
        "teaser": null
      },{
        "title": "splunk를 활용하여 $MFT 파일의 STD과 Fn속성에 있는 타임스탬프 비교",
        "excerpt":"analyzeMFT.py로 파싱된 $MFT 파일의 output를 splunk에 인덱싱하여, STD과 FN 속성에 있는 시간 값을 비교하는 Splunk Query ….      1.analyzeMFT.py를 사용하여 $MFT파일 파싱         /usr/bin/python analyzeMFT.py -f /MFTdump -o mft_output  –bodyfull -a -l     Splunk Query:       sourcetype=\"mft-csv\" | rename \"FN Info Modification date\" AS fn_mtime_datetime, \"Std Info Modification date\" AS std_mtime_datetime | eval fn_mtime = strptime(fn_mtime_datetime, \"%Y-%m-%d %H:%M:%S.%6N\") | eval std_mtime = strptime(std_mtime_datetime, \"%Y-%m-%d %H:%M:%S.%6N\") | where std_mtime = fn_mtime | table std_mtime, std_mtime_datetime, fn_mtime, fn_mtime_datetime,                         ","categories": ["digital-forensics"],
        "tags": ["Forensics"],
        "url": "/digital-forensics/MFT_STD_FN/",
        "teaser": null
      },{
        "title": "Docker Storage Driver에서 Whiteout 검색",
        "excerpt":"Docker는 Union filesystem 구조를 지원하는 Storage Driver를 사용하며, 파일 및 디렉터리가 삭제되었을 경우, whiteout 처리를 한다. Whiteout처리 방식은 Storage Driver에 따라 다르다. 대표적인 Storage Driver인 AUFS와 Overlay2 드라이버에서 whiteout 처리된 파일 및 디렉터리를 검색하는 소스를 코딩하여, 개인 github 사이트에 공개하였습니다. 이 소스코드는 삭제된 파일/디렉터리 중에서 whiteout처리된 파일/디렉터리만 검색이 가능합니다.   Docker-Forensic - github  ","categories": ["digital-forensics"],
        "tags": ["Forensics"],
        "url": "/digital-forensics/Whiteount-docker-container/",
        "teaser": null
      },{
        "title": "Mysql 로그 유형 정리",
        "excerpt":"MYSQL DBMS를 대상으로 사고조사 시에 검토해야 하는 로그 유형 정리…     MYSQL DBMS 로그인 이력   MYSQL DDL 사용이력   MYSQL DML 사용 이력         ","categories": ["digital-forensics"],
        "tags": ["Forensics"],
        "url": "/digital-forensics/Mysql_Log_artifact/",
        "teaser": null
      },{
        "title": "Create Time in EXT4 Filesystem of Linux",
        "excerpt":"Linux 운영체제에서는 파일 및 디렉터리에 대한 시간 정보를 갖고 있으며, 그 시간 정보는 Modified Time, Access Time, 그리고 Changed Time 정보이다. 일반적으로 축약해서 이야기하는 MAC이다. 하지만,  대부분의 Linux 파일시스템, EXT2/EXT3/XFS, 등의 파일 시스템에서는 파일 생성 시간(Creation Time ) 정보를 확인할 수 방법을 제공하지 않습니다. 다만, EXT4 파일 시스템 경우에는 EXT4를 확인할 수 있는 방법이 있다.      Modified Time: 파일 컨텐츠가 수정되었을 때 업데이트 되는 시간을 의미 함.   Accessed Time: 파일 열람으로 인하여 업데이트 되는 시간 정보   Changed Time: 파일과 관련된 Meta 정보가 변경되었을 때 변경되는 시간을 의미 함.   파일 생성 날짜를 확인하기 위하여 wget 명령어를 사용하여 인터넷에 있는 파일을 다운로드 받는다. wget 명령어 옵셥으로 -S를 주게 되면, 헤더 정보에서 Last-Modified 시간 정보를 확인할 수 있다. 이 시간 정보가 이 파일이 Linux 시스템에 생성되었을 때, Modify 시간 정보를 의미 한다.   # wget -S https://download.sysinternals.com/files/Sysmon.zip --2020-07-09 23:19:31--  https://download.sysinternals.com/files/Sysmon.zip Resolving download.sysinternals.com (download.sysinternals.com)... 117.18.232.200 Connecting to download.sysinternals.com (download.sysinternals.com)|117.18.232.200|:443... connected. HTTP request sent, awaiting response... 200 OK Accept-Ranges: bytes   Age: 111660   Content-MD5: /AkL5pWyeeVHU98IEMIV+w==   Content-Type: application/octet-stream   Date: Thu, 09 Jul 2020 14:42:25 GMT   Etag: 0x8D8180E140112D8   Last-Modified: Wed, 24 Jun 2020 07:13:21 GMT   Server: ECAcc (tka/892D)   X-Cache: HIT   x-ms-blob-type: BlockBlob   x-ms-lease-status: unlocked   x-ms-request-id: 9e86fe51-401e-00c3-06fb-54feaf000000   x-ms-version: 2009-09-19   Content-Length: 1810423 Length: 1810423 (1.7M) [application/octet-stream]  Saving to: ‘Sysmon.zip’  Sysmon.zip  100%[=========================&gt;]   1.73M  4.53MB/s    in 0.4s      2020-07-09 23:19:32 (4.53 MB/s) - ‘Sysmon.zip’ saved [1810423/1810423]   ls 명령어를 사용하여 다운로드 완료된 파일을 확인한다. ls 명령어는 다양한 옵션을 제공하지만, Creation time 정보를 확인할 수 있는 옵션은 제공하지를 않는다.   root@parallels-vm:~# ls -alc total 1792 drwx------  4 root root    4096 Jul  9 23:19 . drwxr-xr-x 24 root root    4096 Aug 10  2017 .. -rw-r--r--  1 root root    3106 Aug 10  2017 .bashrc drwx------  2 root root    4096 Aug 10  2017 .cache drwx------  3 root root    4096 Jul  9 23:13 .gnupg -rw-r--r--  1 root root     148 Aug 10  2017 .profile -rw-r--r--  1 root root 1810423 Jul  9 23:19 Sysmon.zip   stat 명령어를 사용하면, Creation Time 정보가 표시되지 않는다. 다만, Birth - 로 표시되는 부분이 파일 생성 시간 정보를 표시해 주는 부분이다. 이 정보를 확인하기 위해서는 대상 파일이 존재하는 파티션에 대한 파일 시스템 정보를 확인하고, debugfs 명령어를 사용하여 디버그 모드로 진입을 해야 한다.   # stat Sysmon.zip    File: 'Sysmon.zip'   Size: 1810423   \tBlocks: 3536       IO Block: 4096   regular file Device: 801h/2049d\tInode: **2621448**     Links: 1 Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root) Access: 2020-07-09 23:19:32.000000000 +0900 Modify: 2020-06-24 16:13:21.000000000 +0900 Change: 2020-07-09 23:19:32.261487486 +0900  **Birth: -**   debugfs 사용함에 있어서 필요한 대상 파일이 있는 파티션의 파일 시스템을 확인한다. 아래 명령어 수행결과를 보면, 해당 파일은 “/” 파티션에 존재하며, 이는 /dev/sad1 파일 시스템에 존재한다.   # df -h Filesystem      Size  Used Avail Use% Mounted on udev            472M     0  472M   0% /dev tmpfs            99M  8.6M   91M   9% /run /dev/sda1        62G  4.1G   55G   7% / tmpfs           493M  252K  493M   1% /dev/shm tmpfs           5.0M  4.0K  5.0M   1% /run/lock tmpfs           493M     0  493M   0% /sys/fs/cgroup Home            466G  170G  297G  37% /media/psf/Hom   위에서 확인한 파일시스템 정보 그리고 Inode 값을 확인한 후, 아래 처럼 debugfs 명령어를 사용한다. 그 결과는 아래에서 볼 수 있 듯이 crtime 이라고 표시된 파일 생성 시간 정보를 확인할 수 있다.   ~# debugfs -R 'stat &lt;2621448&gt;' /dev/sda1  Inode: 2621448 Type: regular Mode: 0644 Flags: 0x80000 Generation: 3303492050 Version: 0x00000000:00000001 User: 0 Group: 0 Size: 1810423 File ACL: 0 Directory ACL: 0 Links: 1 Blockcount: 3536 Fragment: Address: 0 Number: 0 Size: 0 ctime: 0x5f072774:3e57edf8 -- Thu Jul 9 23:19:32 2020 atime: 0x5f072774:00000000 -- Thu Jul 9 23:19:32 2020 mtime: 0x5ef2fd11:00000000 -- Wed Jun 24 16:13:21 2020 crtime: 0x5f072773:d22ba90c -- Thu Jul 9 23:19:31 2020  ","categories": ["digital-forensics"],
        "tags": ["Linux","Forensics"],
        "url": "/digital-forensics/create_time_in_Linux/",
        "teaser": null
      },{
    "title": "Post: Create Time in EXT4 Filesystem of Linux",
    "excerpt":"Creation Time in EXT4   Linux 운영체제에서는 파일 및 디렉터리에 대한 시간 정보를 갖고 있으며, 그 시간 정보는 Modified Time, Access Time, 그리고 Changed Time 정보이다. 일반적으로 축약해서 이야기하는 MAC이다. 하지만,  대부분의 Linux 파일시스템, EXT2/EXT3/XFS, 등의 파일 시스템에서는 파일 생성 시간(Creation Time ) 정보를 확인할 수 방법을 제공하지 않습니다. 다만, EXT4 파일 시스템 경우에는 EXT4를 확인할 수 있는 방법이 있다.      Modified Time: 파일 컨텐츠가 수정되었을 때 업데이트 되는 시간을 의미 함.   Accessed Time: 파일 열람으로 인하여 업데이트 되는 시간 정보   Changed Time: 파일과 관련된 Meta 정보가 변경되었을 때 변경되는 시간을 의미 함.   파일 생성 날짜를 확인하기 위하여 wget 명령어를 사용하여 인터넷에 있는 파일을 다운로드 받는다. wget 명령어 옵셥으로 -S를 주게 되면, 헤더 정보에서 Last-Modified 시간 정보를 확인할 수 있다. 이 시간 정보가 이 파일이 Linux 시스템에 생성되었을 때, Modify 시간 정보를 의미 한다.   # wget -S https://download.sysinternals.com/files/Sysmon.zip --2020-07-09 23:19:31--  https://download.sysinternals.com/files/Sysmon.zip Resolving download.sysinternals.com (download.sysinternals.com)... 117.18.232.200 Connecting to download.sysinternals.com (download.sysinternals.com)|117.18.232.200|:443... connected. HTTP request sent, awaiting response... 200 OK Accept-Ranges: bytes   Age: 111660   Content-MD5: /AkL5pWyeeVHU98IEMIV+w==   Content-Type: application/octet-stream   Date: Thu, 09 Jul 2020 14:42:25 GMT   Etag: 0x8D8180E140112D8   Last-Modified: Wed, 24 Jun 2020 07:13:21 GMT   Server: ECAcc (tka/892D)   X-Cache: HIT   x-ms-blob-type: BlockBlob   x-ms-lease-status: unlocked   x-ms-request-id: 9e86fe51-401e-00c3-06fb-54feaf000000   x-ms-version: 2009-09-19   Content-Length: 1810423 Length: 1810423 (1.7M) [application/octet-stream]  Saving to: ‘Sysmon.zip’  Sysmon.zip  100%[=========================&gt;]   1.73M  4.53MB/s    in 0.4s      2020-07-09 23:19:32 (4.53 MB/s) - ‘Sysmon.zip’ saved [1810423/1810423]   ls 명령어를 사용하여 다운로드 완료된 파일을 확인한다. ls 명령어는 다양한 옵션을 제공하지만, Creation time 정보를 확인할 수 있는 옵션은 제공하지를 않는다.   root@parallels-vm:~# ls -alc total 1792 drwx------  4 root root    4096 Jul  9 23:19 . drwxr-xr-x 24 root root    4096 Aug 10  2017 .. -rw-r--r--  1 root root    3106 Aug 10  2017 .bashrc drwx------  2 root root    4096 Aug 10  2017 .cache drwx------  3 root root    4096 Jul  9 23:13 .gnupg -rw-r--r--  1 root root     148 Aug 10  2017 .profile -rw-r--r--  1 root root 1810423 Jul  9 23:19 Sysmon.zip   stat 명령어를 사용하면, Creation Time 정보가 표시되지 않는다. 다만, Birth - 로 표시되는 부분이 파일 생성 시간 정보를 표시해 주는 부분이다. 이 정보를 확인하기 위해서는 대상 파일이 존재하는 파티션에 대한 파일 시스템 정보를 확인하고, debugfs 명령어를 사용하여 디버그 모드로 진입을 해야 한다.   # stat Sysmon.zip    File: 'Sysmon.zip'   Size: 1810423   \tBlocks: 3536       IO Block: 4096   regular file Device: 801h/2049d\tInode: **2621448**     Links: 1 Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root) Access: 2020-07-09 23:19:32.000000000 +0900 Modify: 2020-06-24 16:13:21.000000000 +0900 Change: 2020-07-09 23:19:32.261487486 +0900  **Birth: -**   debugfs 사용함에 있어서 필요한 대상 파일이 있는 파티션의 파일 시스템을 확인한다. 아래 명령어 수행결과를 보면, 해당 파일은 “/” 파티션에 존재하며, 이는 /dev/sad1 파일 시스템에 존재한다.   # df -h Filesystem      Size  Used Avail Use% Mounted on udev            472M     0  472M   0% /dev tmpfs            99M  8.6M   91M   9% /run /dev/sda1        62G  4.1G   55G   7% / tmpfs           493M  252K  493M   1% /dev/shm tmpfs           5.0M  4.0K  5.0M   1% /run/lock tmpfs           493M     0  493M   0% /sys/fs/cgroup Home            466G  170G  297G  37% /media/psf/Hom   위에서 확인한 파일시스템 정보 그리고 Inode 값을 확인한 후, 아래 처럼 debugfs 명령어를 사용한다. 그 결과는 아래에서 볼 수 있 듯이 crtime 이라고 표시된 파일 생성 시간 정보를 확인할 수 있다.   ~# debugfs -R 'stat &lt;2621448&gt;' /dev/sda1  Inode: 2621448 Type: regular Mode: 0644 Flags: 0x80000 Generation: 3303492050 Version: 0x00000000:00000001 User: 0 Group: 0 Size: 1810423 File ACL: 0 Directory ACL: 0 Links: 1 Blockcount: 3536 Fragment: Address: 0 Number: 0 Size: 0 ctime: 0x5f072774:3e57edf8 -- Thu Jul 9 23:19:32 2020 atime: 0x5f072774:00000000 -- Thu Jul 9 23:19:32 2020 mtime: 0x5ef2fd11:00000000 -- Wed Jun 24 16:13:21 2020 crtime: 0x5f072773:d22ba90c -- Thu Jul 9 23:19:31 2020  ","url": "http://localhost:4000/_pages/categories/digital-forensics/2020-07-09-create_time_in_Linux/"
  },{
    "title": "Page Not Found",
    "excerpt":"Sorry, but the page you were trying to view does not exist.  ","url": "http://localhost:4000/404.html"
  },{
    "title": null,
    "excerpt":" ","url": "http://localhost:4000/categories/"
  },{
    "title": null,
    "excerpt":"          ","url": "http://localhost:4000/"
  },{
    "title": null,
    "excerpt":"var idx = lunr(function () {   this.field('title')   this.field('excerpt')   this.field('categories')   this.field('tags')   this.ref('id')    this.pipeline.remove(lunr.trimmer)    for (var item in store) {     this.add({       title: store[item].title,       excerpt: store[item].excerpt,       categories: store[item].categories,       tags: store[item].tags,       id: item     })   } });  $(document).ready(function() {   $('input#search').on('keyup', function () {     var resultdiv = $('#results');     var query = $(this).val().toLowerCase();     var result =       idx.query(function (q) {         query.split(lunr.tokenizer.separator).forEach(function (term) {           q.term(term, { boost: 100 })           if(query.lastIndexOf(\" \") != query.length-1){             q.term(term, {  usePipeline: false, wildcard: lunr.Query.wildcard.TRAILING, boost: 10 })           }           if (term != \"\"){             q.term(term, {  usePipeline: false, editDistance: 1, boost: 1 })           }         })       });     resultdiv.empty();     resultdiv.prepend(''+result.length+' Result(s) found ');     for (var item in result) {       var ref = result[item].ref;       if(store[ref].teaser){         var searchitem =           ''+             ''+               ''+                 ''+store[ref].title+''+               ' '+               ''+                 ''+               ''+               ''+store[ref].excerpt.split(\" \").splice(0,20).join(\" \")+'... '+             ''+           '';       }       else{     \t  var searchitem =           ''+             ''+               ''+                 ''+store[ref].title+''+               ' '+               ''+store[ref].excerpt.split(\" \").splice(0,20).join(\" \")+'... '+             ''+           '';       }       resultdiv.append(searchitem);     }   }); }); ","url": "http://localhost:4000/assets/js/lunr/lunr-en.js"
  },{
    "title": null,
    "excerpt":"step1list = new Array(); step1list[\"ΦΑΓΙΑ\"] = \"ΦΑ\"; step1list[\"ΦΑΓΙΟΥ\"] = \"ΦΑ\"; step1list[\"ΦΑΓΙΩΝ\"] = \"ΦΑ\"; step1list[\"ΣΚΑΓΙΑ\"] = \"ΣΚΑ\"; step1list[\"ΣΚΑΓΙΟΥ\"] = \"ΣΚΑ\"; step1list[\"ΣΚΑΓΙΩΝ\"] = \"ΣΚΑ\"; step1list[\"ΟΛΟΓΙΟΥ\"] = \"ΟΛΟ\"; step1list[\"ΟΛΟΓΙΑ\"] = \"ΟΛΟ\"; step1list[\"ΟΛΟΓΙΩΝ\"] = \"ΟΛΟ\"; step1list[\"ΣΟΓΙΟΥ\"] = \"ΣΟ\"; step1list[\"ΣΟΓΙΑ\"] = \"ΣΟ\"; step1list[\"ΣΟΓΙΩΝ\"] = \"ΣΟ\"; step1list[\"ΤΑΤΟΓΙΑ\"] = \"ΤΑΤΟ\"; step1list[\"ΤΑΤΟΓΙΟΥ\"] = \"ΤΑΤΟ\"; step1list[\"ΤΑΤΟΓΙΩΝ\"] = \"ΤΑΤΟ\"; step1list[\"ΚΡΕΑΣ\"] = \"ΚΡΕ\"; step1list[\"ΚΡΕΑΤΟΣ\"] = \"ΚΡΕ\"; step1list[\"ΚΡΕΑΤΑ\"] = \"ΚΡΕ\"; step1list[\"ΚΡΕΑΤΩΝ\"] = \"ΚΡΕ\"; step1list[\"ΠΕΡΑΣ\"] = \"ΠΕΡ\"; step1list[\"ΠΕΡΑΤΟΣ\"] = \"ΠΕΡ\"; step1list[\"ΠΕΡΑΤΑ\"] = \"ΠΕΡ\"; step1list[\"ΠΕΡΑΤΩΝ\"] = \"ΠΕΡ\"; step1list[\"ΤΕΡΑΣ\"] = \"ΤΕΡ\"; step1list[\"ΤΕΡΑΤΟΣ\"] = \"ΤΕΡ\"; step1list[\"ΤΕΡΑΤΑ\"] = \"ΤΕΡ\"; step1list[\"ΤΕΡΑΤΩΝ\"] = \"ΤΕΡ\"; step1list[\"ΦΩΣ\"] = \"ΦΩ\"; step1list[\"ΦΩΤΟΣ\"] = \"ΦΩ\"; step1list[\"ΦΩΤΑ\"] = \"ΦΩ\"; step1list[\"ΦΩΤΩΝ\"] = \"ΦΩ\"; step1list[\"ΚΑΘΕΣΤΩΣ\"] = \"ΚΑΘΕΣΤ\"; step1list[\"ΚΑΘΕΣΤΩΤΟΣ\"] = \"ΚΑΘΕΣΤ\"; step1list[\"ΚΑΘΕΣΤΩΤΑ\"] = \"ΚΑΘΕΣΤ\"; step1list[\"ΚΑΘΕΣΤΩΤΩΝ\"] = \"ΚΑΘΕΣΤ\"; step1list[\"ΓΕΓΟΝΟΣ\"] = \"ΓΕΓΟΝ\"; step1list[\"ΓΕΓΟΝΟΤΟΣ\"] = \"ΓΕΓΟΝ\"; step1list[\"ΓΕΓΟΝΟΤΑ\"] = \"ΓΕΓΟΝ\"; step1list[\"ΓΕΓΟΝΟΤΩΝ\"] = \"ΓΕΓΟΝ\";  v = \"[ΑΕΗΙΟΥΩ]\"; v2 = \"[ΑΕΗΙΟΩ]\"  function stemWord(w) {   var stem;   var suffix;   var firstch;   var origword = w;   test1 = new Boolean(true);    if(w.length '+result.length+' Result(s) found ');     for (var item in result) {       var ref = result[item].ref;       if(store[ref].teaser){         var searchitem =           ''+             ''+               ''+                 ''+store[ref].title+''+               ' '+               ''+                 ''+               ''+               ''+store[ref].excerpt.split(\" \").splice(0,20).join(\" \")+'... '+             ''+           '';       }       else{     \t  var searchitem =           ''+             ''+               ''+                 ''+store[ref].title+''+               ' '+               ''+store[ref].excerpt.split(\" \").splice(0,20).join(\" \")+'... '+             ''+           '';       }       resultdiv.append(searchitem);     }   }); }); ","url": "http://localhost:4000/assets/js/lunr/lunr-gr.js"
  },{
    "title": null,
    "excerpt":"var store = [   {%- for c in site.collections -%}     {%- if forloop.last -%}       {%- assign l = true -%}     {%- endif -%}     {%- assign docs = c.docs | where_exp:'doc','doc.search != false' -%}     {%- for doc in docs -%}       {%- if doc.header.teaser -%}         {%- capture teaser -%}{{ doc.header.teaser }}{%- endcapture -%}       {%- else -%}         {%- assign teaser = site.teaser -%}       {%- endif -%}       {         \"title\": {{ doc.title | jsonify }},         \"excerpt\":           {%- if site.search_full_content == true -%}             {{ doc.content | newline_to_br |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \"|             strip_html | strip_newlines | jsonify }},           {%- else -%}             {{ doc.content | newline_to_br |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \" |               replace:\" \", \" \"|             strip_html | strip_newlines | truncatewords: 50 | jsonify }},           {%- endif -%}         \"categories\": {{ doc.categories | jsonify }},         \"tags\": {{ doc.tags | jsonify }},         \"url\": {{ doc.url | relative_url | jsonify }},         \"teaser\": {{ teaser | relative_url | jsonify }}       }{%- unless forloop.last and l -%},{%- endunless -%}     {%- endfor -%}   {%- endfor -%}{%- if site.lunr.search_within_pages -%},   {%- assign pages = site.pages | where_exp:'doc','doc.search != false' -%}   {%- for doc in pages -%}     {%- if forloop.last -%}       {%- assign l = true -%}     {%- endif -%}   {     \"title\": {{ doc.title | jsonify }},     \"excerpt\":         {%- if site.search_full_content == true -%}           {{ doc.content | newline_to_br |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \"|           strip_html | strip_newlines | jsonify }},         {%- else -%}           {{ doc.content | newline_to_br |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \" |             replace:\" \", \" \"|           strip_html | strip_newlines | truncatewords: 50 | jsonify }},         {%- endif -%}       \"url\": {{ doc.url | absolute_url | jsonify }}   }{%- unless forloop.last and l -%},{%- endunless -%}   {%- endfor -%} {%- endif -%}] ","url": "http://localhost:4000/assets/js/lunr/lunr-store.js"
  },{
    "title": "Posts ...",
    "excerpt":"","url": "http://localhost:4000/posts/"
  },{
    "title": null,
    "excerpt":"","url": "http://localhost:4000/search/"
  },{
    "title": null,
    "excerpt":"","url": "http://localhost:4000/tags/"
  },{
    "title": null,
    "excerpt":"{% include feature_row %} ","url": "http://localhost:4000/"
  },{
    "title": null,
    "excerpt":"{% include feature_row %} ","url": "http://localhost:4000/"
  },{
    "title": null,
    "excerpt":" {% if page.xsl %} {% endif %} {% assign collections = site.collections | where_exp:'collection','collection.output != false' %}{% for collection in collections %}{% assign docs = collection.docs | where_exp:'doc','doc.sitemap != false' %}{% for doc in docs %} {{ doc.url | replace:'/index.html','/' | absolute_url | xml_escape }} {% if doc.last_modified_at or doc.date %}{{ doc.last_modified_at | default: doc.date | date_to_xmlschema }} {% endif %} {% endfor %}{% endfor %}{% assign pages = site.html_pages | where_exp:'doc','doc.sitemap != false' | where_exp:'doc','doc.url != \"/404.html\"' %}{% for page in pages %} {{ page.url | replace:'/index.html','/' | absolute_url | xml_escape }} {% if page.last_modified_at %}{{ page.last_modified_at | date_to_xmlschema }} {% endif %} {% endfor %}{% assign static_files = page.static_files | where_exp:'page','page.sitemap != false' | where_exp:'page','page.name != \"404.html\"' %}{% for file in static_files %} {{ file.path | replace:'/index.html','/' | absolute_url | xml_escape }} {{ file.modified_time | date_to_xmlschema }}  {% endfor %} ","url": "http://localhost:4000/sitemap.xml"
  },{
    "title": null,
    "excerpt":"Sitemap: {{ \"sitemap.xml\" | absolute_url }} ","url": "http://localhost:4000/robots.txt"
  },{
    "title": null,
    "excerpt":"{% if page.xsl %}{% endif %}Jekyll{{ site.time | date_to_xmlschema }}{{ page.url | absolute_url | xml_escape }}{% assign title = site.title | default: site.name %}{% if page.collection != \"posts\" %}{% assign collection = page.collection | capitalize %}{% assign title = title | append: \" | \" | append: collection %}{% endif %}{% if page.category %}{% assign category = page.category | capitalize %}{% assign title = title | append: \" | \" | append: category %}{% endif %}{% if title %}{{ title | smartify | xml_escape }}{% endif %}{% if site.description %}{{ site.description | xml_escape }}{% endif %}{% if site.author %}{{ site.author.name | default: site.author | xml_escape }}{% if site.author.email %}{{ site.author.email | xml_escape }}{% endif %}{% if site.author.uri %}{{ site.author.uri | xml_escape }}{% endif %}{% endif %}{% if page.tags %}{% assign posts = site.tags[page.tags] %}{% else %}{% assign posts = site[page.collection] %}{% endif %}{% if page.category %}{% assign posts = posts | where: \"categories\", page.category %}{% endif %}{% unless site.show_drafts %}{% assign posts = posts | where_exp: \"post\", \"post.draft != true\" %}{% endunless %}{% assign posts = posts | sort: \"date\" | reverse %}{% assign posts_limit = site.feed.posts_limit | default: 10 %}{% for post in posts limit: posts_limit %}{% assign post_title = post.title | smartify | strip_html | normalize_whitespace | xml_escape %}{{ post_title }}{{ post.date | date_to_xmlschema }}{{ post.last_modified_at | default: post.date | date_to_xmlschema }}{{ post.id | absolute_url | xml_escape }}{% assign excerpt_only = post.feed.excerpt_only | default: site.feed.excerpt_only %}{% unless excerpt_only %}{% endunless %}{% assign post_author = post.author | default: post.authors[0] | default: site.author %}{% assign post_author = site.data.authors[post_author] | default: post_author %}{% assign post_author_email = post_author.email | default: nil %}{% assign post_author_uri = post_author.uri | default: nil %}{% assign post_author_name = post_author.name | default: post_author %}{{ post_author_name | default: \"\" | xml_escape }}{% if post_author_email %}{{ post_author_email | xml_escape }}{% endif %}{% if post_author_uri %}{{ post_author_uri | xml_escape }}{% endif %}{% if post.category %}{% elsif post.categories %}{% for category in post.categories %}{% endfor %}{% endif %}{% for tag in post.tags %}{% endfor %}{% assign post_summary = post.description | default: post.excerpt %}{% if post_summary and post_summary != empty %}{% endif %}{% assign post_image = post.image.path | default: post.image %}{% if post_image %}{% unless post_image contains \"://\" %}{% assign post_image = post_image | absolute_url %}{% endunless %}{% endif %}{% endfor %}","url": "http://localhost:4000/feed.xml"
  }]
