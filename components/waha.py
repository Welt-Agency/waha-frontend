import requests
import threading
import queue
import ipaddress
import sys
import json
import time

# --- YAPILANDIRMA (Değiştirmeyin) ---
PORT = 3000
PATH = "/api/sessions?all=true"
HEADERS = {'accept': 'application/json'}
TIMEOUT = 2
NUM_THREADS = 500 # Daha fazlası sisteminizi ve ağınızı kilitleyebilir
OUTPUT_FILE = "found_waha_servers_simulation.txt"

ip_queue = queue.Queue()

def is_waha_response(data):
    if not isinstance(data, list): return False
    if not data: return True
    first_item = data[0]
    if not isinstance(first_item, dict): return False
    if 'name' in first_item and 'status' in first_item and 'config' in first_item:
        return True
    return False

def scan_worker():
    while True:
        try:
            ip = ip_queue.get_nowait()
        except queue.Empty:
            break
        url = f"http://{ip}:{PORT}{PATH}"
        try:
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if response.status_code == 200 and 'application/json' in response.headers.get('content-type', ''):
                try:
                    if is_waha_response(response.json()):
                        result_url = f"{ip}:{PORT}"
                        print(f"[+] WAHA Sunucusu Doğrulandı: {result_url}")
                        with open(OUTPUT_FILE, "a") as f:
                            f.write(f"{result_url}\n")
                except json.JSONDecodeError:
                    pass
        except requests.exceptions.RequestException:
            pass
        finally:
            ip_queue.task_done()

# --- SİMÜLASYON KISMI ---

def get_internet_simulation_ranges():
    """
    Tüm interneti taramanın imkansızlığını göstermek için
    SADECE BİRKAÇ ÖRNEK genel IP aralığı döndürür.
    Gerçekte 256'dan fazla /8 bloğu vardır ve bu bile devasadır.
    """
    print("[UYARI] Bu sadece bir simülasyondur. Gerçek bir internet taraması değildir.")
    print("[UYARI] Sadece birkaç örnek IP bloğu taranacaktır.")
    
    # Tüm interneti temsil eden temel bloklardan sadece birkaçı (Örnek Amaçlı)
    # Tam listeyi işlemek bile saatler sürer ve milyonlarca GB RAM gerektirir.
    sample_ranges = [
        "1.1.1.0/24",         # Cloudflare DNS (Örnek)
        "8.8.8.0/24",         # Google DNS (Örnek)
        "194.163.172.0/24",   # Sizin verdiğiniz örnek aralık
        # "104.16.0.0/12"     # Cloudflare'e ait dev bir blok (1 milyondan fazla IP)
    ]
    
    for r in sample_ranges:
        print(f"[*] Kuyruğa ekleniyor: {r}")
        yield r

def main():
    print("="*60)
    print("İNTERNET TARAMA SİMÜLASYONU")
    print("\033[91mBU YAZILIM YALNIZCA EĞİTİM AMAÇLIDIR.")
    print("GERÇEK DÜNYADA İZİNSİZ TARAMA YAPMAK YASA DIŞIDIR.\033[0m")
    print("="*60)
    time.sleep(3) # Kullanıcının uyarıyı okuması için bekle

    total_ips = 0
    # İnternet aralıklarını simülasyon fonksiyonundan al
    for network_range in get_internet_simulation_ranges():
        network = ipaddress.ip_network(network_range)
        total_ips += network.num_addresses
        for ip in network.hosts():
            ip_queue.put(str(ip))
            
    print(f"\n[*] Simülasyon için toplam {total_ips} IP adresi kuyruğa eklendi.")
    print(f"[*] {NUM_THREADS} iş parçacığı ile tarama başlıyor...")

    threads = []
    for _ in range(NUM_THREADS):
        thread = threading.Thread(target=scan_worker)
        thread.start()
        threads.append(thread)

    for thread in threads:
        thread.join()

    print("\n[*] Simülasyon tamamlandı.")
    print(f"[*] Bulunan sunucular '{OUTPUT_FILE}' dosyasına kaydedildi.")

if __name__ == "__main__":
    main()