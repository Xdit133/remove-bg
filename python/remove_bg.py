import sys
import os
from rembg import remove

def process_image(input_path, output_path):
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(input_path, 'rb') as file_in:
            input_bytes = file_in.read()
        output_bytes = remove(input_bytes)
        with open(output_path, 'wb') as file_out:
            file_out.write(output_bytes)
        print(f"Sukses: {output_path}")
    except FileNotFoundError:
        print(f"ERROR: File input tidak ditemukan '{input_path}'")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Terjadi kesalahan: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) != 3:
        sys.exit(1)
    input_file_path = sys.argv[1]
    output_file_path = sys.argv[2]
    process_image(input_file_path, output_file_path)

if __name__ == "__main__":
    main()
