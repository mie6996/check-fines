# Kiểm tra phạt nguội từ https://www.csgt.vn/.

## 1. Setup and run

To complete project setup, do:

```
yarn
```

and run with

```
yarn start
```

call API
```bash
curl --location 'http://localhost:3000/api/v1/check-fines?plate=98A-344.21'
```

Response
```js
{
    "error": false,
    "data": [
        {
            "plate": "98A-344.21",
            "plateColor": "Nền mầu trắng, chữ và số màu đen",
            "vehicleType": "Ô tô",
            "violationTime": "14:00, 15/08/2024",
            "location": "Ngã 4 Nguyễn Thị Minh Khai - Hoàng Văn Thụ, Phường Xương Giang, Thành phố Bắc Giang, Tỉnh Bắc Giang",
            "violationType": "12321.5.1.a.02.Không chấp hành hiệu lệnh của vạch kẻ đường",
            "status": "Đã xử phạt",
            "detectingUnit": "Đội Cảnh sát giao thông, Trật tự - Công an thành phố Bắc Giang - Tỉnh Bắc Giang",
            "resolvingUnit": [
                "1. Đội Cảnh sát giao thông, Trật tự - Công an thành phố Bắc Giang - Tỉnh Bắc Giang",
                "Địa chỉ: số 384 đường Xương Giang, phường Ngô Quyền",
                "Số điện thoại liên hệ: 0911595121"
            ]
        }
    ]
}
```

## 2. Setup and run with Docker
Note that it's possible to let Docker do all inside a container, because all is described in a Dockerfile; see Dockerfile-usage for related commands.

Of course you need a local installation of Docker (recent, if possible latest), but nothing other.