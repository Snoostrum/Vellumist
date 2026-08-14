package com.blog.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private int code;
    private T data;
    private String message;
    private Long total; // 分页总数（仅列表接口返回）

    private ApiResponse(int code, T data, String message, Long total) {
        this.code = code;
        this.data = data;
        this.message = message;
        this.total = total;
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(200, data, "ok", null);
    }

    /** 分页响应：data 为当前页数组，total 为总条数 */
    public static <T> ApiResponse<T> ok(T data, long total) {
        return new ApiResponse<>(200, data, "ok", total);
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, null, message, null);
    }

    public int getCode() { return code; }
    public T getData() { return data; }
    public String getMessage() { return message; }
    public Long getTotal() { return total; }
}
