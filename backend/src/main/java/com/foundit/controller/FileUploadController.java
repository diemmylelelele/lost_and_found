package com.foundit.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        String originalFilename = file.getOriginalFilename();
        String extension = (originalFilename != null && originalFilename.contains("."))
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : ".jpg";

        String filename = UUID.randomUUID() + extension;

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Files.copy(file.getInputStream(), uploadPath.resolve(filename),
                StandardCopyOption.REPLACE_EXISTING);

        return ResponseEntity.ok(Map.of("url", "/uploads/" + filename));
    }
}
