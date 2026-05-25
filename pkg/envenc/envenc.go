package envenc

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

// Format: encrypted:v1:<nonce_base64url>:<ciphertext_base64url>
const prefix = "encrypted:v1:"

// deriveKey produces a 32-byte AES key from any master key via SHA-256.
func deriveKey(masterKey string) []byte {
	h := sha256.Sum256([]byte(masterKey))
	return h[:]
}

// Encrypt encrypts plaintext and returns an "encrypted:v1:…" string.
func Encrypt(masterKey, plaintext string) (string, error) {
	block, err := aes.NewCipher(deriveKey(masterKey))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ct := gcm.Seal(nil, nonce, []byte(plaintext), nil)
	return fmt.Sprintf("%s%s:%s",
		prefix,
		base64.RawURLEncoding.EncodeToString(nonce),
		base64.RawURLEncoding.EncodeToString(ct),
	), nil
}

// Decrypt decrypts an "encrypted:v1:…" value. Returns the value unchanged if it
// is not encrypted — safe to call on any .env value.
func Decrypt(masterKey, value string) (string, error) {
	if !strings.HasPrefix(value, prefix) {
		return value, nil
	}
	body := strings.TrimPrefix(value, prefix)
	parts := strings.SplitN(body, ":", 2)
	if len(parts) != 2 {
		return "", errors.New("malformed encrypted value")
	}
	nonce, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("invalid nonce: %w", err)
	}
	ct, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("invalid ciphertext: %w", err)
	}
	block, err := aes.NewCipher(deriveKey(masterKey))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	pt, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", errors.New("decryption failed — wrong master key or corrupted value")
	}
	return string(pt), nil
}

// IsEncrypted reports whether value was produced by Encrypt.
func IsEncrypted(value string) bool {
	return strings.HasPrefix(value, prefix)
}

// DecryptOSEnv walks os.Environ(), decrypts any "encrypted:v1:…" values
// in-place via os.Setenv. Call this after loading .env and before config.Load().
func DecryptOSEnv(masterKey string) error {
	for _, kv := range os.Environ() {
		idx := strings.IndexByte(kv, '=')
		if idx < 0 {
			continue
		}
		k, v := kv[:idx], kv[idx+1:]
		if !IsEncrypted(v) {
			continue
		}
		plain, err := Decrypt(masterKey, v)
		if err != nil {
			return fmt.Errorf("failed to decrypt %s: %w", k, err)
		}
		if err := os.Setenv(k, plain); err != nil {
			return err
		}
	}
	return nil
}
