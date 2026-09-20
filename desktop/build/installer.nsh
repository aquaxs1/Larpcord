; Larpcord-Anpassungen für den NSIS-Installer (electron-builder).
; - Installation pro Benutzer nach %LocalAppData%\<app> (ohne Unterordner "Programs"), wie bei Vesktop/Discord
; - dunkles Farbschema im Fortschrittsfenster
; - Deinstallation fragt, ob Einstellungen und Presets behalten werden sollen (nicht bei Updates, nicht im Silent-Modus)

!macro preInit
 SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\${APP_FILENAME}"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\${APP_FILENAME}"
 SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\${APP_FILENAME}"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$LocalAppData\${APP_FILENAME}"
!macroend

!macro customHeader
  ; Discord-ähnliche dunkle Farben
  !define LARP_FG 0xF2F3F5
  !define LARP_BG 0x1E1F22

  !macro larpDarkWindow
    SetCtlColors $HWNDPARENT ${LARP_FG} ${LARP_BG}
    FindWindow $0 "#32770" "" $HWNDPARENT
    SetCtlColors $0 ${LARP_FG} ${LARP_BG}
    ; Statustext, Fortschritt, Detailliste der Instfiles-Seite
    GetDlgItem $1 $0 1000
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $0 1004
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $0 1006
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $0 1016
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    ; Kopfbereich und Fußzeile des Hauptfensters
    GetDlgItem $1 $HWNDPARENT 1034
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $HWNDPARENT 1035
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $HWNDPARENT 1036
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $HWNDPARENT 1037
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $HWNDPARENT 1038
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $HWNDPARENT 1039
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
    GetDlgItem $1 $HWNDPARENT 1256
    SetCtlColors $1 ${LARP_FG} ${LARP_BG}
  !macroend

  ; Texte der Deinstallation (Sprache wählt NSIS nach Systemsprache)
  LangString larpKeepData ${LANG_ENGLISH} "Keep your Larpcord settings and presets?$\r$\n$\r$\nYes: your presets, settings and login stay on this PC.$\r$\nNo: everything Larpcord stored on this PC is deleted."
  LangString larpKeepData ${LANG_GERMAN} "Einstellungen und Presets behalten?$\r$\n$\r$\nJa: Presets, Einstellungen und Anmeldung bleiben auf diesem PC.$\r$\nNein: Alle Larpcord-Daten auf diesem PC werden gelöscht."

  !ifdef BUILD_UNINSTALLER
    Function un.onGUIInit
      !insertmacro larpDarkWindow
    FunctionEnd
  !else
    Function .onGUIInit
      !insertmacro larpDarkWindow
    FunctionEnd
  !endif
!macroend

; Vor dem Löschen der Programmdateien fragen, ob die Nutzerdaten bleiben sollen.
; Nicht bei einem Update (--updated) und nicht bei "/S" (stille Deinstallation),
; weil der Auto-Updater die alte Version still deinstalliert.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ClearErrors
    ${GetParameters} $R8
    ${GetOptions} $R8 "/S" $R9
    ${if} ${Errors}
      MessageBox MB_YESNO|MB_ICONQUESTION "$(larpKeepData)" /SD IDYES IDYES larpKeepUserData
        SetShellVarContext current
        RMDir /r "$APPDATA\${APP_FILENAME}"
        !ifdef APP_PRODUCT_FILENAME
          RMDir /r "$APPDATA\${APP_PRODUCT_FILENAME}"
        !endif
        !ifdef APP_PACKAGE_NAME
          RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
        !endif
      larpKeepUserData:
    ${endif}
  ${endif}
!macroend
