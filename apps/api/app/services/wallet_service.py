import os
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from eth_account import Account

from app.core.config import settings


def _get_master_key() -> bytes:
    key_hex = settings.MASTER_ENCRYPTION_KEY
    if len(key_hex) < 64:
        key_hex = key_hex.ljust(64, "0")
    return bytes.fromhex(key_hex[:64])


def create_wallet() -> dict:
    account = Account.create(extra_entropy=secrets.token_bytes(32))
    private_key_bytes = account.key

    dek = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    aesgcm = AESGCM(dek)
    encrypted_private_key = nonce + aesgcm.encrypt(nonce, private_key_bytes, None)

    master_key = _get_master_key()
    wrap_nonce = os.urandom(12)
    master_aesgcm = AESGCM(master_key)
    dek_wrap = wrap_nonce + master_aesgcm.encrypt(wrap_nonce, dek, None)

    recovery_code = secrets.token_urlsafe(24)
    from argon2 import PasswordHasher
    ph = PasswordHasher()
    recovery_code_hash = ph.hash(recovery_code)

    recovery_key = secrets.token_bytes(32)
    recovery_nonce = os.urandom(12)
    recovery_aesgcm = AESGCM(recovery_key)
    recovery_blob = recovery_nonce + recovery_aesgcm.encrypt(recovery_nonce, private_key_bytes, None)

    kdf_params = {
        "algorithm": "AES-256-GCM",
        "key_wrap": "AES-256-GCM",
        "dek_bits": 256,
    }

    return {
        "address": account.address,
        "encrypted_private_key": encrypted_private_key,
        "dek_wrap": dek_wrap,
        "kdf_params": kdf_params,
        "recovery_blob": recovery_blob,
        "recovery_code_hash": recovery_code_hash,
        "recovery_code": recovery_code,
    }


def decrypt_private_key(encrypted_private_key: bytes, dek_wrap: bytes) -> bytes:
    master_key = _get_master_key()
    master_aesgcm = AESGCM(master_key)
    wrap_nonce = dek_wrap[:12]
    dek = master_aesgcm.decrypt(wrap_nonce, dek_wrap[12:], None)

    aesgcm = AESGCM(dek)
    nonce = encrypted_private_key[:12]
    return aesgcm.decrypt(nonce, encrypted_private_key[12:], None)
