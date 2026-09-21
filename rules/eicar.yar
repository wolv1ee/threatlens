rule EICAR_Test_File
{
    meta:
        description = "Matches the EICAR standard antivirus test string. This is not malware - it is an industry-standard string used to verify that a scanner is working."
        severity = "info"
        reference = "https://www.eicar.org/download-anti-malware-testfile/"

    strings:
        $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

    condition:
        $eicar
}
