// dotkey-enc — encrypt and decrypt .env file values
//
// Build:  go build -o dotkey-enc ./tools/envenc
// Usage:  dotkey-enc <command> [args]
//
//	keygen                         print a new DOTKEY_MASTER_KEY
//	encrypt <file> [KEY KEY ...]   encrypt values in-place (auto-detects sensitive keys)
//	decrypt <file>                 print all values decrypted to stdout
package main

import (
	"bufio"
	"crypto/rand"
	"dotkey/pkg/envenc"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
)

// Auto-encrypt any key whose name contains one of these substrings.
var sensitiveSubstrings = []string{
	"SECRET", "KEY", "PASSWORD", "PASSWD", "TOKEN",
	"DATABASE_URL", "DSN", "PRIVATE", "CREDENTIAL",
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}
	switch os.Args[1] {
	case "keygen":
		cmdKeygen()
	case "encrypt":
		cmdEncrypt(os.Args[2:])
	case "decrypt":
		cmdDecrypt(os.Args[2:])
	default:
		printUsage()
		os.Exit(1)
	}
}

// ── Commands ──────────────────────────────────────────────────────────────────

func cmdKeygen() {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		fatalf("keygen: %v", err)
	}
	fmt.Printf("DOTKEY_MASTER_KEY=%s\n", hex.EncodeToString(b))
}

func cmdEncrypt(args []string) {
	if len(args) == 0 {
		fatalf("usage: dotkey-enc encrypt <file> [KEY KEY ...]\n")
	}
	file := args[0]
	specified := make(map[string]bool, len(args)-1)
	for _, k := range args[1:] {
		specified[k] = true
	}

	mk := requireMasterKey()
	lines := mustReadLines(file)
	count := 0

	for i, line := range lines {
		k, v, raw, ok := parseLine(line)
		if !ok || envenc.IsEncrypted(v) {
			continue
		}
		// skip if explicit keys given and this key isn't one of them
		if len(specified) > 0 && !specified[k] {
			continue
		}
		// skip if auto-mode and key doesn't look sensitive
		if len(specified) == 0 && !isSensitive(k) {
			continue
		}
		enc, err := envenc.Encrypt(mk, v)
		if err != nil {
			fatalf("encrypt %s: %v", k, err)
		}
		// rebuild the line: preserve everything before the '=' character,
		// replace the value portion (strip surrounding quotes if any)
		eqIdx := strings.IndexByte(raw, '=')
		lines[i] = raw[:eqIdx+1] + enc
		count++
	}

	if err := writeLines(file, lines); err != nil {
		fatalf("write %s: %v", file, err)
	}
	fmt.Fprintf(os.Stderr, "encrypted %d value(s) in %s\n", count, file)
}

func cmdDecrypt(args []string) {
	if len(args) == 0 {
		fatalf("usage: dotkey-enc decrypt <file>\n")
	}
	mk := requireMasterKey()
	lines := mustReadLines(args[0])

	for _, line := range lines {
		k, v, raw, ok := parseLine(line)
		if !ok {
			fmt.Println(line) // comment or blank — print as-is
			continue
		}
		if !envenc.IsEncrypted(v) {
			fmt.Println(raw)
			continue
		}
		plain, err := envenc.Decrypt(mk, v)
		if err != nil {
			fatalf("decrypt %s: %v", k, err)
		}
		eqIdx := strings.IndexByte(raw, '=')
		fmt.Println(raw[:eqIdx+1] + plain)
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func requireMasterKey() string {
	k := os.Getenv("DOTKEY_MASTER_KEY")
	if k == "" {
		fmt.Fprintln(os.Stderr, "error: DOTKEY_MASTER_KEY is not set")
		fmt.Fprintln(os.Stderr, "  Generate one: dotkey-enc keygen")
		fmt.Fprintln(os.Stderr, "  Then:         export DOTKEY_MASTER_KEY=<value>")
		os.Exit(1)
	}
	return k
}

// parseLine parses a single .env line.
// Returns (key, unquoted-value, original-line, true) for KEY=VALUE lines.
// Returns ("", "", line, false) for blank lines and comments.
func parseLine(line string) (key, value, raw string, ok bool) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" || strings.HasPrefix(trimmed, "#") {
		return "", "", line, false
	}
	idx := strings.IndexByte(trimmed, '=')
	if idx < 0 {
		return "", "", line, false
	}
	k := strings.TrimSpace(trimmed[:idx])
	v := trimmed[idx+1:]
	// strip surrounding quotes (single or double)
	if len(v) >= 2 {
		if (v[0] == '"' && v[len(v)-1] == '"') || (v[0] == '\'' && v[len(v)-1] == '\'') {
			v = v[1 : len(v)-1]
		}
	}
	return k, v, trimmed, true
}

func isSensitive(key string) bool {
	upper := strings.ToUpper(key)
	for _, s := range sensitiveSubstrings {
		if strings.Contains(upper, s) {
			return true
		}
	}
	return false
}

func mustReadLines(path string) []string {
	f, err := os.Open(path)
	if err != nil {
		fatalf("open %s: %v", path, err)
	}
	defer f.Close()
	var lines []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		lines = append(lines, sc.Text())
	}
	return lines
}

func writeLines(path string, lines []string) error {
	content := strings.Join(lines, "\n")
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	return os.WriteFile(path, []byte(content), 0600)
}

func fatalf(format string, a ...any) {
	fmt.Fprintf(os.Stderr, "dotkey-enc: "+format+"\n", a...)
	os.Exit(1)
}

func printUsage() {
	fmt.Fprint(os.Stderr, `dotkey-enc — encrypt/decrypt dotkey .env file values (Pattern A)

Commands:
  keygen                           Generate a secure DOTKEY_MASTER_KEY
  encrypt <file> [KEY KEY ...]     Encrypt values in-place
                                     With no keys: auto-encrypts SECRET, KEY,
                                     PASSWORD, TOKEN, DATABASE_URL, DSN fields
                                     With keys: encrypts only those specific fields
  decrypt <file>                   Print all values decrypted to stdout (preview only)

Environment:
  DOTKEY_MASTER_KEY    Required for encrypt/decrypt. Set before running.

Examples:
  dotkey-enc keygen
  export DOTKEY_MASTER_KEY=<output above>

  dotkey-enc encrypt .env
  # → JWT_SECRET=encrypted:v1:abc123:xyz789...

  dotkey-enc encrypt .env JWT_SECRET ENCRYPTION_KEY
  # → encrypts only those two keys

  dotkey-enc decrypt .env
  # → prints all values in plaintext (does not modify file)

  # At server startup (in shell or Docker):
  export DOTKEY_MASTER_KEY=<key>
  ./dotkey-api   # auto-decrypts encrypted: values before reading config
`)
}
