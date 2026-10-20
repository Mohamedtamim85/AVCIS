/*
 * CIS Critical Security Controls v8.1 — catalog data.
 *
 * 18 Controls / 153 Safeguards with Implementation Group (IG), asset type and
 * security function. Safeguard descriptions are short paraphrased summaries
 * for proposal and assessment use; the authoritative text is published by the
 * Center for Internet Security (https://www.cisecurity.org/controls).
 *
 * Fields per safeguard:
 *   id     – safeguard number, e.g. "1.1"
 *   title  – official safeguard title
 *   asset  – Devices | Software | Data | Users | Network | Documentation
 *   fn     – Govern | Identify | Protect | Detect | Respond | Recover
 *   ig     – lowest Implementation Group that includes it (1, 2 or 3).
 *            IG2 includes all IG1 safeguards, IG3 includes all of them.
 *   desc   – short summary
 */
window.CIS_DATA = {
  version: "8.1",
  assetTypes: ["Devices", "Software", "Data", "Users", "Network", "Documentation"],
  functions: ["Govern", "Identify", "Protect", "Detect", "Respond", "Recover"],
  implementationGroups: [
    { ig: 1, name: "IG1 – Essential Cyber Hygiene", desc: "Minimum standard of information security for every enterprise. Typically small/medium organizations with limited IT and security expertise protecting non-sensitive data." },
    { ig: 2, name: "IG2 – Expanded", desc: "For enterprises with dedicated IT staff managing multiple departments with different risk profiles, often storing sensitive client or enterprise data and subject to regulatory requirements." },
    { ig: 3, name: "IG3 – Comprehensive", desc: "For enterprises with security experts on staff, handling sensitive data and functions subject to regulatory and compliance oversight, which must defend against sophisticated attacks." }
  ],
  // 0–5 maturity scale used to score each safeguard during an assessment.
  maturityLevels: [
    { level: 0, name: "Non-existent", desc: "The safeguard is not implemented; no process or technology is in place." },
    { level: 1, name: "Initial", desc: "Ad hoc and reactive. Done occasionally or by individuals, undocumented and inconsistent." },
    { level: 2, name: "Developing", desc: "Partially implemented. Repeatable in some areas but informal, with gaps in coverage." },
    { level: 3, name: "Defined", desc: "Documented, approved and consistently applied across the in-scope environment." },
    { level: 4, name: "Managed", desc: "Measured and monitored with metrics; deviations are detected and corrected." },
    { level: 5, name: "Optimized", desc: "Automated where possible and continuously improved based on metrics and lessons learned." }
  ],
  controls: [
    {
      id: 1,
      title: "Inventory and Control of Enterprise Assets",
      desc: "Actively manage (inventory, track and correct) all enterprise assets — end-user devices, network devices, IoT, servers, and assets in virtual, cloud and remote environments — to know what needs to be monitored and protected and to find unauthorized or unmanaged assets.",
      why: "You cannot protect what you do not know you have. Unmanaged devices are a common entry point for attackers.",
      safeguards: [
        { id: "1.1", title: "Establish and Maintain Detailed Enterprise Asset Inventory", asset: "Devices", fn: "Identify", ig: 1, desc: "Keep an accurate, detailed inventory of all enterprise assets that can store or process data, including network address, hardware address, owner, department and approval status. Review at least twice a year." },
        { id: "1.2", title: "Address Unauthorized Assets", asset: "Devices", fn: "Respond", ig: 1, desc: "Have a process, run at least weekly, to remove, deny remote access to, or quarantine unauthorized assets." },
        { id: "1.3", title: "Utilize an Active Discovery Tool", asset: "Devices", fn: "Detect", ig: 2, desc: "Use an active discovery tool, run at least daily, to identify assets connected to the enterprise network and update the inventory." },
        { id: "1.4", title: "Use DHCP Logging to Update Enterprise Asset Inventory", asset: "Devices", fn: "Identify", ig: 2, desc: "Use DHCP logging on all DHCP servers or IP address management tools to update the asset inventory, reviewed at least weekly." },
        { id: "1.5", title: "Use a Passive Asset Discovery Tool", asset: "Devices", fn: "Detect", ig: 3, desc: "Use a passive discovery tool to identify assets on the network, with scans reviewed at least weekly to update the inventory." }
      ]
    },
    {
      id: 2,
      title: "Inventory and Control of Software Assets",
      desc: "Actively manage all software (operating systems and applications) on the network so that only authorized software is installed and can execute, and unauthorized or unmanaged software is found and prevented from installation or execution.",
      why: "Unpatched and unknown software is one of the most exploited attack vectors.",
      safeguards: [
        { id: "2.1", title: "Establish and Maintain a Software Inventory", asset: "Software", fn: "Identify", ig: 1, desc: "Maintain a detailed inventory of all licensed software, including title, publisher, install date and business purpose. Review at least twice a year." },
        { id: "2.2", title: "Ensure Authorized Software is Currently Supported", asset: "Software", fn: "Identify", ig: 1, desc: "Only keep currently supported software in the inventory as authorized; document exceptions and mitigating controls for unsupported software. Review monthly." },
        { id: "2.3", title: "Address Unauthorized Software", asset: "Software", fn: "Respond", ig: 1, desc: "Remove unauthorized software from use or document it as an exception. Review at least monthly." },
        { id: "2.4", title: "Utilize Automated Software Inventory Tools", asset: "Software", fn: "Detect", ig: 2, desc: "Use software inventory tools to automate the discovery and documentation of installed software." },
        { id: "2.5", title: "Allowlist Authorized Software", asset: "Software", fn: "Protect", ig: 2, desc: "Use technical controls such as application allowlisting so that only authorized software can execute. Reassess at least twice a year." },
        { id: "2.6", title: "Allowlist Authorized Libraries", asset: "Software", fn: "Protect", ig: 2, desc: "Ensure only authorized software libraries (e.g. .dll, .ocx, .so) are allowed to load into system processes. Reassess at least twice a year." },
        { id: "2.7", title: "Allowlist Authorized Scripts", asset: "Software", fn: "Protect", ig: 3, desc: "Use technical controls such as digital signatures and version control so that only authorized scripts (e.g. .ps1, .py) can execute. Reassess at least twice a year." }
      ]
    },
    {
      id: 3,
      title: "Data Protection",
      desc: "Develop processes and technical controls to identify, classify, securely handle, retain and dispose of data.",
      why: "Data is the asset attackers ultimately want; knowing where sensitive data lives and protecting it limits the impact of a breach.",
      safeguards: [
        { id: "3.1", title: "Establish and Maintain a Data Management Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Document a data management process covering data sensitivity, owners, handling, retention limits and disposal, aligned with enterprise standards. Review annually or after significant changes." },
        { id: "3.2", title: "Establish and Maintain a Data Inventory", asset: "Data", fn: "Identify", ig: 1, desc: "Inventory data based on the data management process, at minimum sensitive data. Review and update annually, prioritizing sensitive data." },
        { id: "3.3", title: "Configure Data Access Control Lists", asset: "Data", fn: "Protect", ig: 1, desc: "Configure access control lists based on a user's need to know, for local and remote file systems, databases and applications." },
        { id: "3.4", title: "Enforce Data Retention", asset: "Data", fn: "Protect", ig: 1, desc: "Retain data according to the data management process, with both minimum and maximum retention timelines." },
        { id: "3.5", title: "Securely Dispose of Data", asset: "Data", fn: "Protect", ig: 1, desc: "Securely dispose of data as defined by the data management process, with disposal methods appropriate to data sensitivity." },
        { id: "3.6", title: "Encrypt Data on End-User Devices", asset: "Devices", fn: "Protect", ig: 1, desc: "Encrypt data on end-user devices containing sensitive data (e.g. BitLocker, FileVault, dm-crypt)." },
        { id: "3.7", title: "Establish and Maintain a Data Classification Scheme", asset: "Documentation", fn: "Govern", ig: 2, desc: "Define a data classification scheme (e.g. Sensitive, Confidential, Public) and classify data accordingly. Review annually." },
        { id: "3.8", title: "Document Data Flows", asset: "Documentation", fn: "Identify", ig: 2, desc: "Document data flows, including service provider data flows, based on the data management process. Review annually." },
        { id: "3.9", title: "Encrypt Data on Removable Media", asset: "Data", fn: "Protect", ig: 2, desc: "Encrypt data stored on removable media." },
        { id: "3.10", title: "Encrypt Sensitive Data in Transit", asset: "Data", fn: "Protect", ig: 2, desc: "Encrypt sensitive data in transit using protocols such as TLS and OpenSSH." },
        { id: "3.11", title: "Encrypt Sensitive Data at Rest", asset: "Data", fn: "Protect", ig: 2, desc: "Encrypt sensitive data at rest on servers, applications and databases; storage-layer encryption is the minimum, application-layer encryption is preferred." },
        { id: "3.12", title: "Segment Data Processing and Storage Based on Sensitivity", asset: "Network", fn: "Protect", ig: 2, desc: "Process and store data based on sensitivity; do not process sensitive data on assets intended for lower-sensitivity data." },
        { id: "3.13", title: "Deploy a Data Loss Prevention Solution", asset: "Data", fn: "Protect", ig: 3, desc: "Implement an automated DLP tool to identify sensitive data stored, processed or transmitted through enterprise assets, including at service providers." },
        { id: "3.14", title: "Log Sensitive Data Access", asset: "Data", fn: "Detect", ig: 3, desc: "Log access to sensitive data, including modification and disposal." }
      ]
    },
    {
      id: 4,
      title: "Secure Configuration of Enterprise Assets and Software",
      desc: "Establish and maintain the secure configuration of enterprise assets (end-user devices, network devices, IoT, servers) and software (operating systems and applications).",
      why: "Default configurations favour ease of use over security and are easily exploited.",
      safeguards: [
        { id: "4.1", title: "Establish and Maintain a Secure Configuration Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Document a secure configuration process for enterprise assets and software. Review annually or after significant changes." },
        { id: "4.2", title: "Establish and Maintain a Secure Configuration Process for Network Infrastructure", asset: "Documentation", fn: "Govern", ig: 1, desc: "Document a secure configuration process for network devices. Review annually or after significant changes." },
        { id: "4.3", title: "Configure Automatic Session Locking on Enterprise Assets", asset: "Users", fn: "Protect", ig: 1, desc: "Lock sessions after inactivity: no more than 15 minutes for general-purpose OSs and 2 minutes for mobile devices." },
        { id: "4.4", title: "Implement and Manage a Firewall on Servers", asset: "Devices", fn: "Protect", ig: 1, desc: "Implement and manage a firewall on servers, where supported (virtual firewall, OS firewall or third-party agent)." },
        { id: "4.5", title: "Implement and Manage a Firewall on End-User Devices", asset: "Devices", fn: "Protect", ig: 1, desc: "Implement a host-based firewall or port-filtering tool on end-user devices with a default-deny rule." },
        { id: "4.6", title: "Securely Manage Enterprise Assets and Software", asset: "Network", fn: "Protect", ig: 1, desc: "Manage assets and software securely, e.g. via version-controlled infrastructure-as-code and secure protocols such as SSH and HTTPS; avoid insecure protocols like Telnet and HTTP." },
        { id: "4.7", title: "Manage Default Accounts on Enterprise Assets and Software", asset: "Users", fn: "Protect", ig: 1, desc: "Manage default accounts such as root, administrator and pre-configured vendor accounts — disable them or make them unusable." },
        { id: "4.8", title: "Uninstall or Disable Unnecessary Services on Enterprise Assets and Software", asset: "Devices", fn: "Protect", ig: 2, desc: "Uninstall or disable unnecessary services, such as unused file-sharing services, web application modules or service functions." },
        { id: "4.9", title: "Configure Trusted DNS Servers on Enterprise Assets", asset: "Devices", fn: "Protect", ig: 2, desc: "Configure assets to use enterprise-controlled or reputable externally accessible DNS servers." },
        { id: "4.10", title: "Enforce Automatic Device Lockout on Portable End-User Devices", asset: "Devices", fn: "Respond", ig: 2, desc: "Lock devices after a set number of failed local authentication attempts (e.g. no more than 20 for laptops, 10 for mobile)." },
        { id: "4.11", title: "Enforce Remote Wipe Capability on Portable End-User Devices", asset: "Devices", fn: "Protect", ig: 2, desc: "Remotely wipe enterprise data from portable devices when lost or stolen, or when a person leaves the enterprise." },
        { id: "4.12", title: "Separate Enterprise Workspaces on Mobile End-User Devices", asset: "Devices", fn: "Protect", ig: 3, desc: "Use a separate enterprise workspace on mobile devices to isolate enterprise applications and data from personal ones." }
      ]
    },
    {
      id: 5,
      title: "Account Management",
      desc: "Use processes and tools to assign and manage authorization to credentials for user accounts, including administrator and service accounts, to enterprise assets and software.",
      why: "Valid but abused credentials are one of the easiest ways for attackers to blend in.",
      safeguards: [
        { id: "5.1", title: "Establish and Maintain an Inventory of Accounts", asset: "Users", fn: "Identify", ig: 1, desc: "Inventory all accounts — user and administrator — with name, username, start/stop dates and department. Validate that all active accounts are authorized at least quarterly." },
        { id: "5.2", title: "Use Unique Passwords", asset: "Users", fn: "Protect", ig: 1, desc: "Use unique passwords for all assets; at minimum 8 characters with MFA, or 14 characters without MFA." },
        { id: "5.3", title: "Disable Dormant Accounts", asset: "Users", fn: "Respond", ig: 1, desc: "Delete or disable accounts after 45 days of inactivity, where supported." },
        { id: "5.4", title: "Restrict Administrator Privileges to Dedicated Administrator Accounts", asset: "Users", fn: "Protect", ig: 1, desc: "Restrict admin privileges to dedicated admin accounts; perform general browsing, email and productivity work from a non-privileged account." },
        { id: "5.5", title: "Establish and Maintain an Inventory of Service Accounts", asset: "Users", fn: "Identify", ig: 2, desc: "Inventory service accounts with department owner, review date and purpose. Review at least quarterly." },
        { id: "5.6", title: "Centralize Account Management", asset: "Users", fn: "Protect", ig: 2, desc: "Centralize account management through a directory or identity service." }
      ]
    },
    {
      id: 6,
      title: "Access Control Management",
      desc: "Use processes and tools to create, assign, manage and revoke access credentials and privileges for user, administrator and service accounts.",
      why: "Least privilege and strong authentication limit how far an attacker can move with a stolen account.",
      safeguards: [
        { id: "6.1", title: "Establish an Access Granting Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Establish and follow a documented process, preferably automated, for granting access upon new hire or role change." },
        { id: "6.2", title: "Establish an Access Revoking Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Establish and follow a process, preferably automated, for revoking access upon termination, rights revocation or role change; disable rather than delete accounts to preserve audit trails." },
        { id: "6.3", title: "Require MFA for Externally-Exposed Applications", asset: "Users", fn: "Protect", ig: 1, desc: "Require MFA for all externally-exposed enterprise or third-party applications, where supported." },
        { id: "6.4", title: "Require MFA for Remote Network Access", asset: "Users", fn: "Protect", ig: 1, desc: "Require MFA for remote network access." },
        { id: "6.5", title: "Require MFA for Administrative Access", asset: "Users", fn: "Protect", ig: 1, desc: "Require MFA for all administrative access accounts on all enterprise assets, on-site or via a service provider." },
        { id: "6.6", title: "Establish and Maintain an Inventory of Authentication and Authorization Systems", asset: "Software", fn: "Identify", ig: 2, desc: "Inventory the enterprise's authentication and authorization systems, including on-site and remote ones. Review at least annually." },
        { id: "6.7", title: "Centralize Access Control", asset: "Users", fn: "Protect", ig: 2, desc: "Centralize access control for all assets through a directory service or SSO provider, where supported." },
        { id: "6.8", title: "Define and Maintain Role-Based Access Control", asset: "Documentation", fn: "Govern", ig: 3, desc: "Define access rights per role and perform access control reviews at least annually." }
      ]
    },
    {
      id: 7,
      title: "Continuous Vulnerability Management",
      desc: "Develop a plan to continuously assess and track vulnerabilities on all enterprise assets in order to remediate and minimize the window of opportunity for attackers.",
      why: "Attackers weaponize newly published vulnerabilities within days; patching speed matters.",
      safeguards: [
        { id: "7.1", title: "Establish and Maintain a Vulnerability Management Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Document a vulnerability management process for enterprise assets. Review annually or after significant changes." },
        { id: "7.2", title: "Establish and Maintain a Remediation Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Establish a risk-based remediation strategy with monthly or more frequent reviews." },
        { id: "7.3", title: "Perform Automated Operating System Patch Management", asset: "Software", fn: "Protect", ig: 1, desc: "Perform OS updates through automated patch management at least monthly." },
        { id: "7.4", title: "Perform Automated Application Patch Management", asset: "Software", fn: "Protect", ig: 1, desc: "Perform application updates through automated patch management at least monthly." },
        { id: "7.5", title: "Perform Automated Vulnerability Scans of Internal Enterprise Assets", asset: "Software", fn: "Identify", ig: 2, desc: "Scan internal assets at least quarterly with authenticated and unauthenticated scans using a SCAP-compliant tool." },
        { id: "7.6", title: "Perform Automated Vulnerability Scans of Externally-Exposed Enterprise Assets", asset: "Software", fn: "Identify", ig: 2, desc: "Scan externally-exposed assets at least monthly using a SCAP-compliant tool." },
        { id: "7.7", title: "Remediate Detected Vulnerabilities", asset: "Software", fn: "Respond", ig: 2, desc: "Remediate detected vulnerabilities through processes and tooling, monthly or more frequently, based on the remediation process." }
      ]
    },
    {
      id: 8,
      title: "Audit Log Management",
      desc: "Collect, alert on, review and retain audit logs of events that could help detect, understand or recover from an attack.",
      why: "Without logs, attacks go unnoticed and incidents cannot be investigated.",
      safeguards: [
        { id: "8.1", title: "Establish and Maintain an Audit Log Management Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Document an audit log management process defining collection, review and retention requirements. Review annually or after significant changes." },
        { id: "8.2", title: "Collect Audit Logs", asset: "Data", fn: "Detect", ig: 1, desc: "Collect audit logs and ensure logging is enabled across enterprise assets per the log management process." },
        { id: "8.3", title: "Ensure Adequate Audit Log Storage", asset: "Data", fn: "Protect", ig: 1, desc: "Ensure logging destinations have adequate storage to comply with the log management process." },
        { id: "8.4", title: "Standardize Time Synchronization", asset: "Network", fn: "Protect", ig: 2, desc: "Standardize time synchronization using at least two synchronized time sources across assets, where supported." },
        { id: "8.5", title: "Collect Detailed Audit Logs", asset: "Data", fn: "Detect", ig: 2, desc: "Configure detailed logging for assets containing sensitive data, including event source, date, username, timestamp, source and destination addresses." },
        { id: "8.6", title: "Collect DNS Query Audit Logs", asset: "Data", fn: "Detect", ig: 2, desc: "Collect DNS query audit logs, where appropriate and supported." },
        { id: "8.7", title: "Collect URL Request Audit Logs", asset: "Data", fn: "Detect", ig: 2, desc: "Collect URL request audit logs, where appropriate and supported." },
        { id: "8.8", title: "Collect Command-Line Audit Logs", asset: "Data", fn: "Detect", ig: 2, desc: "Collect command-line audit logs, e.g. from PowerShell, BASH and remote administrative terminals." },
        { id: "8.9", title: "Centralize Audit Logs", asset: "Data", fn: "Detect", ig: 2, desc: "Centralize audit log collection and retention to the extent possible." },
        { id: "8.10", title: "Retain Audit Logs", asset: "Data", fn: "Protect", ig: 2, desc: "Retain audit logs for a minimum of 90 days." },
        { id: "8.11", title: "Conduct Audit Log Reviews", asset: "Data", fn: "Detect", ig: 2, desc: "Review audit logs at least weekly to detect anomalies or abnormal events that could indicate a potential threat." },
        { id: "8.12", title: "Collect Service Provider Logs", asset: "Data", fn: "Detect", ig: 3, desc: "Collect service provider logs, where supported, including authentication, authorization, data creation/disposal and user management events." }
      ]
    },
    {
      id: 9,
      title: "Email and Web Browser Protections",
      desc: "Improve protections and detections of threats from email and web vectors, which give attackers the opportunity to manipulate human behaviour through direct engagement.",
      why: "Email and web browsing are the most common initial access paths (phishing, drive-by downloads).",
      safeguards: [
        { id: "9.1", title: "Ensure Use of Only Fully Supported Browsers and Email Clients", asset: "Software", fn: "Protect", ig: 1, desc: "Only allow fully supported browsers and email clients to execute, using the latest version provided by the vendor." },
        { id: "9.2", title: "Use DNS Filtering Services", asset: "Network", fn: "Protect", ig: 1, desc: "Use DNS filtering services on all assets to block access to known malicious domains." },
        { id: "9.3", title: "Maintain and Enforce Network-Based URL Filters", asset: "Network", fn: "Protect", ig: 2, desc: "Enforce network-based URL filters to limit access to malicious or unapproved websites (category, reputation or block lists)." },
        { id: "9.4", title: "Restrict Unnecessary or Unauthorized Browser and Email Client Extensions", asset: "Software", fn: "Protect", ig: 2, desc: "Restrict, by uninstalling or disabling, any unauthorized or unnecessary browser or email client plugins, extensions and add-ons." },
        { id: "9.5", title: "Implement DMARC", asset: "Network", fn: "Protect", ig: 2, desc: "Implement DMARC policy and verification, starting with SPF and DKIM standards, to reduce spoofed or modified email." },
        { id: "9.6", title: "Block Unnecessary File Types", asset: "Network", fn: "Protect", ig: 2, desc: "Block unnecessary file types attempting to enter the enterprise's email gateway." },
        { id: "9.7", title: "Deploy and Maintain Email Server Anti-Malware Protections", asset: "Network", fn: "Protect", ig: 3, desc: "Deploy email server anti-malware protections such as attachment scanning and/or sandboxing." }
      ]
    },
    {
      id: 10,
      title: "Malware Defenses",
      desc: "Prevent or control the installation, spread and execution of malicious applications, code or scripts on enterprise assets.",
      why: "Malware, including ransomware, remains a primary tool for compromise and extortion.",
      safeguards: [
        { id: "10.1", title: "Deploy and Maintain Anti-Malware Software", asset: "Devices", fn: "Protect", ig: 1, desc: "Deploy and maintain anti-malware software on all enterprise assets." },
        { id: "10.2", title: "Configure Automatic Anti-Malware Signature Updates", asset: "Devices", fn: "Protect", ig: 1, desc: "Configure automatic updates of anti-malware signature files on all assets." },
        { id: "10.3", title: "Disable Autorun and Autoplay for Removable Media", asset: "Devices", fn: "Protect", ig: 1, desc: "Disable autorun and autoplay auto-execute functionality for removable media." },
        { id: "10.4", title: "Configure Automatic Anti-Malware Scanning of Removable Media", asset: "Devices", fn: "Detect", ig: 2, desc: "Configure anti-malware software to automatically scan removable media." },
        { id: "10.5", title: "Enable Anti-Exploitation Features", asset: "Devices", fn: "Protect", ig: 2, desc: "Enable anti-exploitation features such as DEP, Windows Defender Exploit Guard, or SIP and Gatekeeper, where possible." },
        { id: "10.6", title: "Centrally Manage Anti-Malware Software", asset: "Devices", fn: "Protect", ig: 2, desc: "Centrally manage anti-malware software." },
        { id: "10.7", title: "Use Behavior-Based Anti-Malware Software", asset: "Devices", fn: "Detect", ig: 2, desc: "Use behaviour-based anti-malware software (e.g. EDR)." }
      ]
    },
    {
      id: 11,
      title: "Data Recovery",
      desc: "Establish and maintain data recovery practices sufficient to restore in-scope enterprise assets to a pre-incident and trusted state.",
      why: "Reliable, tested, isolated backups are the last line of defence against ransomware and destructive attacks.",
      safeguards: [
        { id: "11.1", title: "Establish and Maintain a Data Recovery Process", asset: "Documentation", fn: "Govern", ig: 1, desc: "Document a data recovery process covering scope, prioritization and the security of backup data. Review annually or after significant changes." },
        { id: "11.2", title: "Perform Automated Backups", asset: "Data", fn: "Recover", ig: 1, desc: "Perform automated backups of in-scope assets, weekly or more frequently based on data sensitivity." },
        { id: "11.3", title: "Protect Recovery Data", asset: "Data", fn: "Protect", ig: 1, desc: "Protect recovery data with controls equivalent to the original data, including encryption or data separation." },
        { id: "11.4", title: "Establish and Maintain an Isolated Instance of Recovery Data", asset: "Data", fn: "Recover", ig: 1, desc: "Maintain an isolated instance of recovery data, e.g. offline, cloud or off-site, version controlled." },
        { id: "11.5", title: "Test Data Recovery", asset: "Data", fn: "Recover", ig: 2, desc: "Test backup recovery quarterly or more frequently for a sampling of in-scope assets." }
      ]
    },
    {
      id: 12,
      title: "Network Infrastructure Management",
      desc: "Establish, implement and actively manage network devices to prevent attackers from exploiting vulnerable network services and access points.",
      why: "Insecure network devices and flat networks let attackers move laterally and intercept traffic.",
      safeguards: [
        { id: "12.1", title: "Ensure Network Infrastructure is Up-to-Date", asset: "Network", fn: "Protect", ig: 1, desc: "Keep network infrastructure up to date, e.g. running the latest stable release and using currently supported network-as-a-service offerings. Review monthly." },
        { id: "12.2", title: "Establish and Maintain a Secure Network Architecture", asset: "Network", fn: "Protect", ig: 2, desc: "Design and maintain a secure network architecture addressing segmentation, least privilege and availability." },
        { id: "12.3", title: "Securely Manage Network Infrastructure", asset: "Network", fn: "Protect", ig: 2, desc: "Securely manage network infrastructure, e.g. version-controlled infrastructure-as-code and secure protocols such as SSH and HTTPS." },
        { id: "12.4", title: "Establish and Maintain Architecture Diagram(s)", asset: "Documentation", fn: "Govern", ig: 2, desc: "Maintain architecture diagram(s) and other network system documentation. Review annually or after significant changes." },
        { id: "12.5", title: "Centralize Network Authentication, Authorization, and Auditing (AAA)", asset: "Network", fn: "Protect", ig: 2, desc: "Centralize network AAA." },
        { id: "12.6", title: "Use of Secure Network Management and Communication Protocols", asset: "Network", fn: "Protect", ig: 2, desc: "Use secure network management and communication protocols, e.g. 802.1X and WPA2 Enterprise or greater." },
        { id: "12.7", title: "Ensure Remote Devices Utilize a VPN and are Connecting to an Enterprise's AAA Infrastructure", asset: "Devices", fn: "Protect", ig: 2, desc: "Require users to authenticate to enterprise-managed VPN and authentication services before accessing enterprise resources on end-user devices." },
        { id: "12.8", title: "Establish and Maintain Dedicated Computing Resources for All Administrative Work", asset: "Devices", fn: "Protect", ig: 3, desc: "Use dedicated, physically or logically segmented computing resources for all administrative tasks, without internet access." }
      ]
    },
    {
      id: 13,
      title: "Network Monitoring and Defense",
      desc: "Operate processes and tooling to establish and maintain comprehensive network monitoring and defense against security threats across the enterprise's network infrastructure and user base.",
      why: "Detecting malicious activity early dramatically reduces the cost and impact of an incident.",
      safeguards: [
        { id: "13.1", title: "Centralize Security Event Alerting", asset: "Network", fn: "Detect", ig: 2, desc: "Centralize security event alerting across assets for log correlation and analysis, e.g. with a SIEM." },
        { id: "13.2", title: "Deploy a Host-Based Intrusion Detection Solution", asset: "Devices", fn: "Detect", ig: 2, desc: "Deploy a host-based intrusion detection solution on assets, where appropriate and supported." },
        { id: "13.3", title: "Deploy a Network Intrusion Detection Solution", asset: "Network", fn: "Detect", ig: 2, desc: "Deploy a network intrusion detection solution on assets, where appropriate (e.g. NIDS or cloud service provider equivalent)." },
        { id: "13.4", title: "Perform Traffic Filtering Between Network Segments", asset: "Network", fn: "Protect", ig: 2, desc: "Perform traffic filtering between network segments, where appropriate." },
        { id: "13.5", title: "Manage Access Control for Remote Assets", asset: "Devices", fn: "Protect", ig: 2, desc: "Manage access control for remote assets based on up-to-date anti-malware, configuration compliance and patch status." },
        { id: "13.6", title: "Collect Network Traffic Flow Logs", asset: "Network", fn: "Detect", ig: 2, desc: "Collect network traffic flow logs and/or network traffic for review and alerting from network devices." },
        { id: "13.7", title: "Deploy a Host-Based Intrusion Prevention Solution", asset: "Devices", fn: "Protect", ig: 3, desc: "Deploy a host-based intrusion prevention solution (e.g. EDR client or host-based IPS agent), where appropriate." },
        { id: "13.8", title: "Deploy a Network Intrusion Prevention Solution", asset: "Network", fn: "Protect", ig: 3, desc: "Deploy a network intrusion prevention solution (e.g. NIPS or equivalent cloud service), where appropriate." },
        { id: "13.9", title: "Deploy Port-Level Access Control", asset: "Devices", fn: "Protect", ig: 3, desc: "Deploy port-level access control using 802.1x or similar network access control protocols, such as certificates." },
        { id: "13.10", title: "Perform Application Layer Filtering", asset: "Network", fn: "Protect", ig: 3, desc: "Perform application layer filtering, e.g. a filtering proxy, application layer firewall or gateway." },
        { id: "13.11", title: "Tune Security Event Alerting Thresholds", asset: "Network", fn: "Detect", ig: 3, desc: "Tune security event alerting thresholds monthly or more frequently." }
      ]
    },
    {
      id: 14,
      title: "Security Awareness and Skills Training",
      desc: "Establish and maintain a security awareness program to influence workforce behaviour to be security conscious and properly skilled to reduce cybersecurity risks.",
      why: "People are targeted directly; a trained workforce is an effective and inexpensive defence.",
      safeguards: [
        { id: "14.1", title: "Establish and Maintain a Security Awareness Program", asset: "Documentation", fn: "Govern", ig: 1, desc: "Establish a security awareness program; train workforce members at hire and at minimum annually. Review annually or after significant changes." },
        { id: "14.2", title: "Train Workforce Members to Recognize Social Engineering Attacks", asset: "Users", fn: "Protect", ig: 1, desc: "Train workforce members to recognize social engineering attacks such as phishing, business email compromise, pretexting and tailgating." },
        { id: "14.3", title: "Train Workforce Members on Authentication Best Practices", asset: "Users", fn: "Protect", ig: 1, desc: "Train on authentication best practices, e.g. MFA, password composition and credential management." },
        { id: "14.4", title: "Train Workforce on Data Handling Best Practices", asset: "Users", fn: "Protect", ig: 1, desc: "Train on how to identify and properly store, transfer, archive and destroy sensitive data, including clear-screen and clear-desk practices." },
        { id: "14.5", title: "Train Workforce Members on Causes of Unintentional Data Exposure", asset: "Users", fn: "Protect", ig: 1, desc: "Train on causes of unintentional data exposure, e.g. mis-delivery of data, losing a portable device or publishing data to unintended audiences." },
        { id: "14.6", title: "Train Workforce Members on Recognizing and Reporting Security Incidents", asset: "Users", fn: "Protect", ig: 1, desc: "Train workforce members to recognize a potential incident and be able to report it." },
        { id: "14.7", title: "Train Workforce on How to Identify and Report if Their Enterprise Assets are Missing Security Updates", asset: "Users", fn: "Protect", ig: 1, desc: "Train workforce to understand how to verify and report out-of-date software patches or failures in automated processes and tools." },
        { id: "14.8", title: "Train Workforce on the Dangers of Connecting to and Transmitting Enterprise Data Over Insecure Networks", asset: "Users", fn: "Protect", ig: 1, desc: "Train on the dangers of insecure networks for enterprise activities, including secure configuration of home networks for remote workers." },
        { id: "14.9", title: "Conduct Role-Specific Security Awareness and Skills Training", asset: "Users", fn: "Protect", ig: 2, desc: "Provide role-specific training, e.g. secure system administration for IT staff, OWASP Top 10 for web developers, and advanced social engineering awareness for high-profile roles." }
      ]
    },
    {
      id: 15,
      title: "Service Provider Management",
      desc: "Develop a process to evaluate service providers who hold sensitive data or are responsible for critical IT platforms or processes, to ensure they are protecting those platforms and data appropriately.",
      why: "Supply-chain and third-party compromises can bypass an organization's own defences.",
      safeguards: [
        { id: "15.1", title: "Establish and Maintain an Inventory of Service Providers", asset: "Users", fn: "Identify", ig: 1, desc: "Inventory service providers with classification(s) and an enterprise contact for each. Review annually or after significant changes." },
        { id: "15.2", title: "Establish and Maintain a Service Provider Management Policy", asset: "Documentation", fn: "Govern", ig: 2, desc: "Maintain a service provider management policy addressing classification, inventory, assessment, monitoring and decommissioning. Review annually." },
        { id: "15.3", title: "Classify Service Providers", asset: "Documentation", fn: "Govern", ig: 2, desc: "Classify service providers by data sensitivity, data volume, availability requirements, applicable regulations, inherent and mitigated risk." },
        { id: "15.4", title: "Ensure Service Provider Contracts Include Security Requirements", asset: "Documentation", fn: "Govern", ig: 2, desc: "Ensure contracts include security requirements such as security program requirements, incident and breach notification, data encryption and disposal commitments." },
        { id: "15.5", title: "Assess Service Providers", asset: "Users", fn: "Govern", ig: 3, desc: "Assess service providers consistent with the policy, e.g. review of SOC 2 / PCI reports, questionnaires or other rigorous processes. Reassess annually." },
        { id: "15.6", title: "Monitor Service Providers", asset: "Data", fn: "Detect", ig: 3, desc: "Monitor service providers consistent with the policy, e.g. periodic reassessment, monitoring release notes and dark web monitoring." },
        { id: "15.7", title: "Securely Decommission Service Providers", asset: "Data", fn: "Protect", ig: 3, desc: "Securely decommission service providers, including deactivating user and service accounts, terminating data flows and securely disposing of enterprise data." }
      ]
    },
    {
      id: 16,
      title: "Application Software Security",
      desc: "Manage the security life cycle of in-house developed, hosted or acquired software to prevent, detect and remediate security weaknesses before they can impact the enterprise.",
      why: "Applications are a frequent target; building security into development is far cheaper than fixing breaches.",
      safeguards: [
        { id: "16.1", title: "Establish and Maintain a Secure Application Development Process", asset: "Documentation", fn: "Govern", ig: 2, desc: "Maintain a secure application development process covering secure design, coding practices, developer training, vulnerability management, third-party code security and testing. Review annually." },
        { id: "16.2", title: "Establish and Maintain a Process to Accept and Address Software Vulnerabilities", asset: "Documentation", fn: "Govern", ig: 2, desc: "Maintain a process to accept and address reports of software vulnerabilities, including a means for external entities to report them." },
        { id: "16.3", title: "Perform Root Cause Analysis on Security Vulnerabilities", asset: "Software", fn: "Protect", ig: 2, desc: "Perform root cause analysis on security vulnerabilities to reduce recurrence of the underlying issues." },
        { id: "16.4", title: "Establish and Manage an Inventory of Third-Party Software Components", asset: "Software", fn: "Identify", ig: 2, desc: "Inventory third-party components used in development (a 'bill of materials'), including risks each component could pose. Evaluate monthly." },
        { id: "16.5", title: "Use Up-to-Date and Trusted Third-Party Software Components", asset: "Software", fn: "Protect", ig: 2, desc: "Use up-to-date, trusted third-party software components, preferably established and proven frameworks and libraries." },
        { id: "16.6", title: "Establish and Maintain a Severity Rating System and Process for Application Vulnerabilities", asset: "Documentation", fn: "Govern", ig: 2, desc: "Maintain a severity rating system and process to prioritize the order in which discovered vulnerabilities are fixed, with minimum security acceptability levels for release." },
        { id: "16.7", title: "Use Standard Hardening Configuration Templates for Application Infrastructure", asset: "Software", fn: "Protect", ig: 2, desc: "Use industry-recommended hardening templates for application infrastructure (servers, databases, web servers, cloud containers, PaaS/SaaS)." },
        { id: "16.8", title: "Separate Production and Non-Production Systems", asset: "Software", fn: "Protect", ig: 2, desc: "Maintain separate environments for production and non-production systems." },
        { id: "16.9", title: "Train Developers in Application Security Concepts and Secure Coding", asset: "Software", fn: "Protect", ig: 2, desc: "Ensure all software development personnel receive training in writing secure code for their environment and responsibilities, at least annually." },
        { id: "16.10", title: "Apply Secure Design Principles in Application Architectures", asset: "Software", fn: "Protect", ig: 2, desc: "Apply secure design principles such as least privilege, input validation, attack surface minimization and secure defaults." },
        { id: "16.11", title: "Leverage Vetted Modules or Services for Application Security Components", asset: "Software", fn: "Protect", ig: 2, desc: "Use vetted modules or services for security components such as identity management, encryption, auditing and logging." },
        { id: "16.12", title: "Implement Code-Level Security Checks", asset: "Software", fn: "Protect", ig: 3, desc: "Apply static and dynamic analysis tools within the application life cycle to verify that secure coding practices are followed." },
        { id: "16.13", title: "Conduct Application Penetration Testing", asset: "Software", fn: "Protect", ig: 3, desc: "Conduct application penetration testing for critical applications, including authenticated testing to find business logic flaws." },
        { id: "16.14", title: "Conduct Threat Modeling", asset: "Software", fn: "Protect", ig: 3, desc: "Conduct threat modeling to identify and address application security design flaws before code is created." }
      ]
    },
    {
      id: 17,
      title: "Incident Response Management",
      desc: "Establish a program to develop and maintain an incident response capability (policies, plans, procedures, defined roles, training and communications) to prepare, detect and quickly respond to an attack.",
      why: "A practiced response plan reduces downtime, cost and reputational damage when — not if — an incident happens.",
      safeguards: [
        { id: "17.1", title: "Designate Personnel to Manage Incident Handling", asset: "Users", fn: "Respond", ig: 1, desc: "Designate one key person, and at least one backup, to manage the incident handling process. Review annually or after significant changes." },
        { id: "17.2", title: "Establish and Maintain Contact Information for Reporting Security Incidents", asset: "Users", fn: "Respond", ig: 1, desc: "Maintain contact information for parties to be informed of incidents — internal staff, service providers, law enforcement, insurers, regulators. Verify annually." },
        { id: "17.3", title: "Establish and Maintain an Enterprise Process for Reporting Incidents", asset: "Documentation", fn: "Govern", ig: 1, desc: "Document a process for the workforce to report security incidents, including timeframe, personnel to report to and the reporting mechanism. Publicize to the workforce." },
        { id: "17.4", title: "Establish and Maintain an Incident Response Process", asset: "Documentation", fn: "Govern", ig: 2, desc: "Document an incident response process addressing roles, compliance requirements and a communication plan. Review annually." },
        { id: "17.5", title: "Assign Key Roles and Responsibilities", asset: "Users", fn: "Respond", ig: 2, desc: "Assign key incident response roles, including legal, IT, security, facilities, PR, HR, incident responders and analysts. Review annually." },
        { id: "17.6", title: "Define Mechanisms for Communicating During Incident Response", asset: "Users", fn: "Respond", ig: 2, desc: "Determine primary and secondary communication mechanisms during an incident (phone, email, secure chat, notification letters)." },
        { id: "17.7", title: "Conduct Routine Incident Response Exercises", asset: "Users", fn: "Recover", ig: 2, desc: "Plan and conduct incident response exercises and scenarios for key personnel at least annually, testing communication, decision-making and workflows." },
        { id: "17.8", title: "Conduct Post-Incident Reviews", asset: "Users", fn: "Recover", ig: 2, desc: "Conduct post-incident reviews to prevent recurrence through lessons learned and follow-up actions." },
        { id: "17.9", title: "Establish and Maintain Security Incident Thresholds", asset: "Documentation", fn: "Recover", ig: 3, desc: "Establish thresholds that differentiate an incident from an event, e.g. abnormal activity, security vulnerability or data breach. Review annually." }
      ]
    },
    {
      id: 18,
      title: "Penetration Testing",
      desc: "Test the effectiveness and resiliency of enterprise assets by identifying and exploiting weaknesses in controls (people, processes and technology) and simulating the objectives and actions of an attacker.",
      why: "Penetration tests validate that controls actually work against a real-world attacker.",
      safeguards: [
        { id: "18.1", title: "Establish and Maintain a Penetration Testing Program", asset: "Documentation", fn: "Govern", ig: 2, desc: "Maintain a penetration testing program appropriate to the enterprise's size, complexity and maturity, covering scope, frequency, limitations, contacts and remediation." },
        { id: "18.2", title: "Perform Periodic External Penetration Tests", asset: "Network", fn: "Identify", ig: 2, desc: "Perform periodic external penetration tests, at least annually, including enterprise and environmental reconnaissance. May be clear box or opaque box." },
        { id: "18.3", title: "Remediate Penetration Test Findings", asset: "Network", fn: "Protect", ig: 2, desc: "Remediate penetration test findings based on the enterprise's remediation scope and prioritization policy." },
        { id: "18.4", title: "Validate Security Measures", asset: "Network", fn: "Protect", ig: 3, desc: "Validate security measures after each penetration test and modify rule sets and capabilities to detect the techniques used." },
        { id: "18.5", title: "Perform Periodic Internal Penetration Tests", asset: "Network", fn: "Identify", ig: 3, desc: "Perform periodic internal penetration tests, at least annually. May be clear box or opaque box." }
      ]
    }
  ]
};
