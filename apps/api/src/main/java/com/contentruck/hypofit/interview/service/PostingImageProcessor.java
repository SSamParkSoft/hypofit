package com.contentruck.hypofit.interview.service;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.interview.client.SupabasePostingImageClient;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Component;

@Component
public class PostingImageProcessor {
    public record Processed(byte[] detail, byte[] thumbnail, int width, int height) { }

    public Processed process(byte[] bytes) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) throw invalid();
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid();
            ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName();
                if (!"JPEG".equalsIgnoreCase(format) && !"PNG".equalsIgnoreCase(format)) throw invalid();
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 8192 || height > 8192 || (long) width * height > 12_000_000) throw invalid();
                BufferedImage source = reader.read(0);
                BufferedImage detail = resize(source, 2560);
                byte[] detailBytes = jpeg(detail);
                if (detailBytes.length > SupabasePostingImageClient.MAX_BYTES) throw invalid();
                return new Processed(detailBytes, jpeg(resize(detail, 480)), detail.getWidth(), detail.getHeight());
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw invalid();
        }
    }

    private BufferedImage resize(BufferedImage source, int maxSide) {
        double ratio = Math.min(1, (double) maxSide / Math.max(source.getWidth(), source.getHeight()));
        BufferedImage image = new BufferedImage(Math.max(1, (int) (source.getWidth() * ratio)),
                Math.max(1, (int) (source.getHeight() * ratio)), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.drawImage(source, 0, 0, image.getWidth(), image.getHeight(), null);
        } finally {
            graphics.dispose();
        }
        return image;
    }

    private byte[] jpeg(BufferedImage image) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        if (!ImageIO.write(image, "jpg", output)) throw invalid();
        return output.toByteArray();
    }

    private HypofitException invalid() {
        return new HypofitException("posting_image_invalid", "이미지는 크기를 줄인 JPG 또는 PNG로 올려 주세요.", 400, null);
    }
}
