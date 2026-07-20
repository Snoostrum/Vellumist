package com.blog.model;

public class ApiResponse<T> {
    private int code;
    private T data;
    private String message;

    private ApiResponse(int code, T data, String message) {
        this.code = code;
        this.data = data;
        this.message = message;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(200, data, "ok");
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, null, message);
    }

    public int getCode() { return code; }
    public T getData() { return data; }
    public String getMessage() { return message; }
}
