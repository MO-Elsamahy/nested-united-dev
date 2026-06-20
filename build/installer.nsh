; =====================================================
; NestedUnited - Professional NSIS Custom Script
; Developer: MZ Software & Tech Solutions
; =====================================================

!macro customInstall
  ; Write company registry information
  WriteRegStr HKLM "Software\MZ Software\NestedUnited" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\MZ Software\NestedUnited" "Publisher" "MZ Software & Tech Solutions"
  WriteRegStr HKLM "Software\MZ Software\NestedUnited" "InstallPath" "$INSTDIR"
  
  ; Write Add/Remove Programs metadata
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "Publisher" "MZ Software & Tech Solutions"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "HelpLink" "https://nestedunited.com"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "URLInfoAbout" "https://nestedunited.com"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "Comments" "Professional Property Management Platform by MZ Software"
!macroend

!macro customUnInstall
  ; Clean up registry on uninstall
  DeleteRegKey HKLM "Software\MZ Software\NestedUnited"
!macroend
